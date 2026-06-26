import { useEffect, useRef, useState } from "react";
import { clientId, saveSession, loadSession, clearSession } from "./lib/id.js";
import { openRoom, roomExists, hasSupabase } from "./lib/net.js";
import { buildTeam } from "./engine/team.js";
import { DEFAULT_FORMATION } from "./engine/formations.js";
import {
  createManagerDraft,
  ensureRoll,
  applyReroll,
  applyPick,
  applyMove,
  autoStep,
} from "./engine/draft7a0.js";
import { SQUADS, squadLabel, loadSquads } from "./data/squads.js";
import { simulateMatch } from "./engine/match.js";
import {
  createTournament,
  applyMatchResult,
  nextMatch,
  tournamentFinished,
  allMatches,
} from "./engine/tournament.js";
import { TEAM_EMOJIS, freeColor, Logo } from "./components/bits.jsx";
import Home from "./components/Home.jsx";
import Lobby from "./components/Lobby.jsx";
import Draft7a0 from "./components/Draft7a0.jsx";
import Tournament from "./components/Tournament.jsx";
import Champion from "./components/Champion.jsx";
import DevHarness from "./components/DevHarness.jsx";
import Auth from "./components/Auth.jsx";
import Profile from "./components/Profile.jsx";
import { getSession, onAuthChange, getProfile, signOut } from "./lib/auth.js";
import * as history from "./lib/history.js";
import { isUuid } from "./lib/history.js";

// Aplica uma intent de draft (roll/reroll/pick/move/auto) ao estado — usado pelo
// redutor autoritativo (anfitrião) e pelo modo local.
function applyDraftIntent(prev, intent, players, settings) {
  if (prev.phase !== "draft" || !prev.draft) return prev;
  let d = prev.draft;
  switch (intent.kind) {
    case "formation":
      d = structuredClone(d);
      if (d.mgr[intent.managerId] && Object.keys(d.mgr[intent.managerId].slots).length === 0)
        d.mgr[intent.managerId].formation = intent.formation;
      break;
    case "reroll":
      d = applyReroll(d, intent.managerId, intent.rerollKind);
      break;
    case "pick":
      d = applyPick(d, intent.managerId, intent.playerId, intent.slotIndex);
      break;
    case "move":
      d = applyMove(d, intent.managerId, intent.from, intent.to);
      break;
    case "auto":
      d = autoStep(d, intent.managerId);
      break;
    default:
      return prev;
  }
  const next = { ...prev, draft: d };
  if (d.done) {
    next.phase = "tournament";
    next.tournament = createTournament(players || prev.players, settings || prev.settings);
    // token estável por instância de torneio — chave para gravar matches/champion no Supabase
    next.tournamentToken = "t_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  return next;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode() {
  let c = "";
  for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}

// Cria um técnico humano com cor e escudo únicos na sala.
function makePlayer(id, name, players = []) {
  const first = name.split(" ")[0] || "Time";
  const usedColors = players.map((p) => p.color);
  const usedEmojis = players.map((p) => p.emoji);
  const emoji = TEAM_EMOJIS.find((e) => !usedEmojis.includes(e)) || TEAM_EMOJIS[players.length % TEAM_EMOJIS.length];
  return {
    id,
    name,
    teamName: `${first} FC`,
    emoji,
    color: freeColor(usedColors),
    joinedAt: Date.now() + players.length,
  };
}

// Cria um adversário-bot aleatório que É uma seleção real; escudo = bandeira, cor única.
function makeSquadBot(players = []) {
  const usedSquadIds = players.filter((p) => p.squadId).map((p) => p.squadId);
  const usedColors = players.map((p) => p.color);
  const avail = SQUADS.filter((s) => !usedSquadIds.includes(s.id));
  const pool = avail.length ? avail : SQUADS;
  const squad = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: "bot_" + Math.random().toString(36).slice(2, 8),
    name: "CPU",
    teamName: squadLabel(squad),
    emoji: squad.iso2 ? `fl:${squad.iso2}` : squad.flagSrc ? `fls:${squad.flagSrc}` : squad.code,
    color: freeColor(usedColors),
    flag: squad.flag,
    joinedAt: Date.now() + players.length,
    isBot: true,
    squadId: squad.id,
  };
}

export default function App() {
  // Identidade: quando logado, é o auth.uid() (Supabase Auth); offline/convidado cai no
  // id anônimo do aparelho. `auth === undefined` = ainda verificando a sessão salva.
  const guestIdRef = useRef(clientId());
  const [auth, setAuth] = useState(hasSupabase ? undefined : null);
  const [guest, setGuest] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const myId = auth?.user?.id || guestIdRef.current;
  const [room, setRoom] = useState(null);
  const [gstate, setGstate] = useState(null);
  const [online, setOnline] = useState([]);
  const [screen, setScreen] = useState("home");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(loadSession());
  const [dev, setDev] = useState(false);
  const [squadsReady, setSquadsReady] = useState(false);
  const [squadsError, setSquadsError] = useState("");
  const roomRef = useRef(null);
  const wasMemberRef = useRef(false);

  // Carrega as seleções reais do Supabase uma vez (250 seleções / 5.6k jogadores).
  useEffect(() => {
    let alive = true;
    loadSquads()
      .then(() => alive && setSquadsReady(true))
      .catch((e) => alive && setSquadsError(e?.message || "falha ao carregar seleções"));
    return () => { alive = false; };
  }, []);

  // Sessão de login (Supabase Auth): lê a salva e escuta login/logout/refresh.
  useEffect(() => {
    if (!hasSupabase) { setAuth(null); return; }
    let alive = true;
    getSession().then((s) => alive && setAuth(s)).catch(() => alive && setAuth(null));
    const off = onAuthChange((s) => setAuth(s));
    return () => { alive = false; off && off(); };
  }, []);

  // Carrega o meu profile (nome do time, escudo, cor) quando logo.
  useEffect(() => {
    const uid = auth?.user?.id;
    if (!uid) { setProfile(null); return; }
    let alive = true;
    getProfile(uid).then((p) => alive && setProfile(p)).catch(() => {});
    return () => { alive = false; };
  }, [auth]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Expulsão: se eu já estava na sala e o anfitrião me removeu da lista (online),
  // saio para a Home. Não dispara no modo local nem para o próprio anfitrião.
  useEffect(() => {
    if (!gstate) { wasMemberRef.current = false; return; }
    const inPlayers = gstate.players?.some((p) => p.id === myId);
    if (inPlayers) { wasMemberRef.current = true; return; }
    if (wasMemberRef.current && gstate.hostId !== myId && !room?.isLocal) {
      wasMemberRef.current = false;
      leave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstate, myId, room]);

  // Meu jogador na sala. Se estou logado, uso os dados do profile (time/escudo/cor);
  // senão, gero como antes (convidado).
  function makeMe(players, nameFallback) {
    const me = makePlayer(myId, profile?.display_name || nameFallback, players);
    if (profile) {
      if (profile.team_name) me.teamName = profile.team_name;
      if (profile.emoji) me.emoji = profile.emoji;
      if (profile.color) me.color = profile.color;
    }
    return me;
  }

  function attach(r, name) {
    setRoom(r);
    setGstate(r.getState());
    r.onChange((s) => setGstate(s));
    r.onPresence((list) => setOnline(list));
    saveSession({ code: r.code, name });
    setSession({ code: r.code, name });
    setScreen("room");
  }

  async function onCreate(name) {
    setError("");
    setConnecting(true);
    try {
      let code = genCode();
      let tries = 0;
      while (tries < 6 && (await roomExists(code))) {
        code = genCode();
        tries++;
      }
      const host = makeMe([], name);
      const initialState = {
        v: 1,
        code,
        hostId: myId,
        phase: "lobby",
        settings: { format: "knockout", modality: "pvp", difficulty: "classic", turnTimer: 30, squadPool: "all", bracketSize: 4, leagueSize: 6, cupSize: 8 },
        players: [host],
        draft: null,
        tournament: null,
        presenting: null,
      };
      const r = await openRoom(code, {
        create: true,
        initialState,
        presenceMeta: { cid: myId, name },
      });
      attach(r, name);
    } catch (e) {
      setError("Não foi possível criar a sala. " + (e?.message || ""));
    } finally {
      setConnecting(false);
    }
  }

  async function onJoin(code, name) {
    setError("");
    setConnecting(true);
    try {
      const r = await openRoom(code, {
        create: false,
        presenceMeta: { cid: myId, name },
      });
      await r.setState((prev) => {
        if (!prev) return prev;
        if (prev.players.some((p) => p.id === myId)) return prev;
        return { ...prev, players: [...prev.players, makeMe(prev.players, name)] };
      });
      attach(r, name);
    } catch (e) {
      if (e?.code === "not_found") setError("Sala não encontrada. Confira o código.");
      else setError("Não foi possível entrar. " + (e?.message || ""));
    } finally {
      setConnecting(false);
    }
  }

  async function onRejoin() {
    const s = loadSession();
    if (!s) return;
    setError("");
    setConnecting(true);
    try {
      const r = await openRoom(s.code, {
        create: false,
        presenceMeta: { cid: myId, name: s.name },
      });
      await r.setState((prev) => {
        if (!prev) return prev;
        if (prev.players.some((p) => p.id === myId)) return prev;
        return { ...prev, players: [...prev.players, makeMe(prev.players, s.name)] };
      });
      attach(r, s.name);
    } catch (e) {
      clearSession();
      setSession(null);
      setError("Não foi possível voltar para a sala.");
    } finally {
      setConnecting(false);
    }
  }

  async function leave() {
    if (roomRef.current) await roomRef.current.leave();
    clearSession();
    setSession(null);
    setRoom(null);
    setGstate(null);
    setOnline([]);
    setScreen("home");
  }

  async function onSignOut() {
    try { await leave(); } catch (_) {}
    try { await signOut(); } catch (_) {}
    setGuest(false);
    setProfile(null);
  }

  // ---------- ações dentro da sala ----------
  const setState = (updater) => roomRef.current && roomRef.current.setState(updater);

  const actions = {
    updateMe(patch) {
      setState((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === myId ? { ...p, ...patch } : p)),
      }));
    },
    addLocalPlayer(name) {
      setState((prev) => {
        const id = "local_" + Math.random().toString(36).slice(2, 8);
        return { ...prev, players: [...prev.players, makePlayer(id, name, prev.players)] };
      });
    },
    addBot() {
      setState((prev) => {
        if (prev.players.length >= 16) return prev;
        return { ...prev, players: [...prev.players, makeSquadBot(prev.players)] };
      });
    },
    removePlayer(id) {
      setState((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }));
    },
    setSettings(patch) {
      setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    claimHost() {
      setState((prev) => ({ ...prev, hostId: myId }));
    },
    leave,
    startDraft() {
      setState((prev) => {
        const humanCount = prev.players.filter((p) => !p.isBot).length;
        if (humanCount < 1) return prev;
        // Auto-preenche as vagas com seleções-bot aleatórias até o alvo conforme o formato.
        const fmt = prev.settings.format;
        const targetN = fmt === "league" ? (prev.settings.leagueSize || 6)
          : fmt === "cup" ? (prev.settings.cupSize || 8)
          : (prev.settings.bracketSize || 4);
        const floor = fmt === "cup" ? 6 : 2; // copa precisa de pelo menos 6 times
        const target = Math.min(16, Math.max(targetN, prev.players.length, floor));
        const players = [...prev.players];
        let guard = 0;
        while (players.length < target && guard < 32) {
          players.push(makeSquadBot(players));
          guard++;
        }
        prev = { ...prev, players };
        const humans = prev.players.filter((p) => !p.isBot);
        const mgr = {};
        humans.forEach((p) => {
          mgr[p.id] = createManagerDraft(DEFAULT_FORMATION, prev.settings.difficulty);
        });
        let draft = {
          taken: [],
          takenPersons: [], // player_id (pessoa) já levados — bloqueia o mesmo jogador de outra época
          mgr,
          difficulty: prev.settings.difficulty,
          turnTimer: prev.settings.turnTimer || 30,
          pool: prev.settings.squadPool || "all",
          done: false,
        };
        // sorteio inicial de cada técnico
        humans.forEach((p) => (draft = ensureRoll(draft, p.id)));
        return { ...prev, phase: "draft", draft };
      });
    },
    // Envia uma intent de draft (aplica direto se for o controlador; senão, broadcast).
    dispatchDraft(intent) {
      const full = { ...intent, managerId: intent.managerId || myId };
      const controller = roomRef.current?.isLocal || roomRef.current?.getState()?.hostId === myId;
      if (controller) {
        setState((prev) => applyDraftIntent(prev, full, prev.players, prev.settings));
      } else {
        roomRef.current?.broadcast?.("draft", full);
      }
    },
    simulateNext() {
      setState((prev) => {
        const t = structuredClone(prev.tournament);
        const m = nextMatch(t);
        if (!m) return prev;
        const ko = t.format === "knockout" || (t.format === "cup" && t.phase === "knockout");
        const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), { knockout: ko });
        applyMatchResult(t, m.id, result, prev.players);
        return { ...prev, tournament: t, presenting: { matchId: m.id, ts: Date.now() } };
      });
    },
    continueAfterMatch() {
      setState((prev) => {
        const fin = tournamentFinished(prev.tournament);
        return { ...prev, presenting: null, phase: fin ? "finished" : "tournament" };
      });
    },
    // Abre a partida 2D ao vivo (resultado é gerado pelo motor ao terminar).
    startLiveMatch(matchId) {
      setState((prev) => ({ ...prev, presenting: { matchId, mode: "live", ts: Date.now() } }));
    },
    finishLiveMatch(matchId, result) {
      setState((prev) => {
        if (!prev.tournament) return prev;
        const t = structuredClone(prev.tournament);
        applyMatchResult(t, matchId, result, prev.players);
        const fin = tournamentFinished(t);
        return { ...prev, tournament: t, presenting: null, phase: fin ? "finished" : "tournament" };
      });
    },
    simulateRound() {
      setState((prev) => {
        const t = structuredClone(prev.tournament);
        if (t.format === "cup") {
          if (t.phase === "groups") {
            const allFix = t.groups.flatMap((g) => g.fixtures);
            const unplayed = allFix.filter((f) => !f.played);
            if (unplayed.length) {
              const r = Math.min(...unplayed.map((f) => f.round));
              for (const f of allFix) {
                if (f.round === r && !f.played) {
                  const result = simulateMatch(buildTeam(prev, f.homeId), buildTeam(prev, f.awayId), { knockout: false });
                  applyMatchResult(t, f.id, result, prev.players);
                }
              }
            }
          } else {
            const round = t.rounds[t.rounds.length - 1];
            for (const m of round) {
              if (m.played || m.isBye) continue;
              const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), { knockout: true });
              applyMatchResult(t, m.id, result, prev.players);
            }
          }
        } else if (t.format === "knockout") {
          const round = t.rounds[t.rounds.length - 1];
          for (const m of round) {
            if (m.played) continue;
            const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), {
              knockout: true,
            });
            applyMatchResult(t, m.id, result, prev.players);
          }
        } else {
          const unplayed = t.fixtures.filter((f) => !f.played);
          if (unplayed.length) {
            const r = Math.min(...unplayed.map((f) => f.round));
            for (const f of t.fixtures) {
              if (f.round === r && !f.played) {
                const result = simulateMatch(buildTeam(prev, f.homeId), buildTeam(prev, f.awayId), {
                  knockout: false,
                });
                applyMatchResult(t, f.id, result, prev.players);
              }
            }
          }
        }
        const fin = tournamentFinished(t);
        return { ...prev, tournament: t, presenting: null, phase: fin ? "finished" : "tournament" };
      });
    },
    simulateAll() {
      setState((prev) => {
        const t = structuredClone(prev.tournament);
        let guard = 0;
        while (!tournamentFinished(t) && guard < 600) {
          const m = nextMatch(t);
          if (!m) break;
          const ko = t.format === "knockout" || (t.format === "cup" && t.phase === "knockout");
          const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), { knockout: ko });
          applyMatchResult(t, m.id, result, prev.players);
          guard++;
        }
        return { ...prev, tournament: t, presenting: null, phase: "finished" };
      });
    },
    playAgain() {
      setState((prev) => ({
        ...prev,
        phase: "lobby",
        draft: null,
        tournament: null,
        presenting: null,
      }));
    },
  };

  // ---------- redutor autoritativo do draft (anfitrião aplica intents recebidas) ----------
  useEffect(() => {
    if (!room) return;
    const controller = room.isLocal || gstate?.hostId === myId;
    if (!controller) return;
    const off = room.onBroadcast?.((event, data) => {
      if (event !== "draft") return;
      setState((prev) => applyDraftIntent(prev, data, prev.players, prev.settings));
    });
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, gstate?.hostId, myId]);

  // ---------- A4: persistência de partidas/torneio (só o anfitrião autenticado) ----------
  // Garante rooms.host_id = meu uid (as policies de matches/tournaments dependem disso).
  useEffect(() => {
    if (!hasSupabase || !auth || !room || room.isLocal) return;
    if (gstate?.hostId !== myId || !gstate?.code) return;
    history.ensureRoomHost(gstate.code, myId);
  }, [room, auth, gstate?.hostId, gstate?.code, myId]);

  // Grava cada partida recém-concluída uma única vez (dedupe por id → seguro em StrictMode
  // e cobre todos os caminhos: ao vivo, simular-próxima, simular-rodada/tudo).
  const recordedRef = useRef(new Set());
  useEffect(() => {
    if (!hasSupabase || !auth || !room || room.isLocal) return;
    if (gstate?.hostId !== myId) return;
    const t = gstate?.tournament;
    const token = gstate?.tournamentToken;
    if (!t || !token) return;
    const name = t.format === "league" ? "Liga FutDraft" : t.format === "cup" ? "Copa FutDraft" : "Mata-mata FutDraft";
    const sideOf = (id) => {
      const p = gstate.players.find((x) => x.id === id);
      return { userId: isUuid(id) ? id : null, squad: p?.squadId || null };
    };
    for (const m of allMatches(t)) {
      if (!m.played || !m.result || m.result.bye || m.isBye) continue;
      const key = token + ":" + m.id;
      if (recordedRef.current.has(key)) continue;
      recordedRef.current.add(key);
      history.recordMatch({
        token, roomId: gstate.code, name, format: t.format, round: m.round,
        home: sideOf(m.homeId), away: sideOf(m.awayId), result: m.result,
      });
    }
    if (tournamentFinished(t) && t.champion) {
      const ckey = "champ:" + token;
      if (!recordedRef.current.has(ckey)) {
        recordedRef.current.add(ckey);
        const champ = gstate.players.find((x) => x.id === t.champion);
        history.setChampion({
          token,
          championUserId: isUuid(t.champion) ? t.champion : null,
          championSquad: champ?.squadId || null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstate?.tournament, gstate?.tournamentToken, gstate?.hostId, auth, room, myId]);

  // ---------- render ----------
  if (dev) return <DevHarness onExit={() => setDev(false)} />;

  // Verificando a sessão salva (evita piscar a tela de login).
  if (auth === undefined) {
    return (
      <div className="app">
        <div className="screen center-screen">
          <Logo />
          <p className="muted">Carregando…</p>
        </div>
      </div>
    );
  }

  // Online sem login (e não convidado) → tela de conta.
  if (hasSupabase && !auth && !guest) {
    return (
      <div className="app app-full">
        <Auth onGuest={() => setGuest(true)} isLocal={!hasSupabase} />
        <button className="dev-fab" onClick={() => setDev(true)} title="Modo desenvolvedor">🛠 DEV</button>
      </div>
    );
  }

  // Tela de perfil (acessível só da Home, logado).
  if (showProfile && auth) {
    return (
      <div className="app app-full">
        <Profile
          myId={myId}
          profile={profile}
          onClose={() => setShowProfile(false)}
          onProfileChange={(p) => p && setProfile(p)}
        />
      </div>
    );
  }

  if (screen === "home" || !gstate) {
    if (screen === "room" && !gstate) {
      return (
        <div className="app">
          <div className="screen center-screen">
            <Logo />
            <p className="muted">Conectando…</p>
          </div>
        </div>
      );
    }
    return (
      <div className="app app-full">
        <Home
          onCreate={onCreate}
          onJoin={onJoin}
          onRejoin={onRejoin}
          session={session}
          connecting={connecting}
          error={error}
          isLocal={!hasSupabase}
          account={auth ? profile : null}
          onSignOut={auth ? onSignOut : null}
          onOpenProfile={auth ? () => setShowProfile(true) : null}
        />
        <button className="dev-fab" onClick={() => setDev(true)} title="Modo desenvolvedor">🛠 DEV</button>
      </div>
    );
  }

  const isHost = gstate.hostId === myId;
  const isLocal = !!room?.isLocal;
  const hostOffline = !isLocal && online.length > 0 && !online.includes(gstate.hostId);

  const liveFull = gstate.phase === "tournament" && gstate.presenting?.mode === "live";
  return (
    <div className={"app" + (gstate.phase === "lobby" || liveFull ? " app-full" : "") + (liveFull ? " live-match" : "")}>
      {gstate.phase === "lobby" && (
        <Lobby
          state={gstate}
          myId={myId}
          online={online}
          isHost={isHost}
          isLocal={isLocal}
          actions={actions}
          hostOffline={hostOffline}
          squadsReady={squadsReady}
          squadsError={squadsError}
        />
      )}
      {gstate.phase === "draft" && (
        <Draft7a0 state={gstate} myId={myId} isLocal={isLocal} isHost={isHost} actions={actions} />
      )}
      {gstate.phase === "tournament" && (
        <Tournament
          state={gstate}
          myId={myId}
          isHost={isHost}
          isLocal={isLocal}
          room={room}
          actions={actions}
          hostOffline={hostOffline}
          onLeave={() => setScreen("home")}
        />
      )}
      {gstate.phase === "finished" && (
        <Champion state={gstate} myId={myId} isHost={isHost} actions={actions} />
      )}
      <button className="dev-fab" onClick={() => setDev(true)} title="Modo desenvolvedor">🛠 DEV</button>
    </div>
  );
}
