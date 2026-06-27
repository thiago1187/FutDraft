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
import { TEAM_EMOJIS, TEAM_COLORS, freeColor, Logo } from "./components/bits.jsx";
import Home from "./components/Home.jsx";
import Lobby from "./components/Lobby.jsx";
import Draft7a0 from "./components/Draft7a0.jsx";
import Tournament from "./components/Tournament.jsx";
import Champion from "./components/Champion.jsx";
import DevHarness from "./components/DevHarness.jsx";
import Auth from "./components/Auth.jsx";
import ResetPassword from "./components/ResetPassword.jsx";
import Profile from "./components/Profile.jsx";
import { getSession, onAuthChange, getProfile, signOut } from "./lib/auth.js";
import * as history from "./lib/history.js";
import { isUuid } from "./lib/history.js";
import { listFriendships } from "./lib/social.js";
import { randomSeed } from "./engine/rng.js";

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

// Traduz erros técnicos (RLS/permissão do Postgres) para algo legível ao jogador.
function friendlyError(e, fallback) {
  const msg = String(e?.message || "").toLowerCase();
  if (e?.code === "42501" || msg.includes("row-level security") || msg.includes("permission")) {
    return "Sem permissão para essa ação (você precisa estar logado e ser membro da sala).";
  }
  if (e?.code === "not_found" || msg.includes("not_found")) return "Sala não encontrada. Confira o código.";
  if (msg.includes("timeout") || msg.includes("conexão") || msg.includes("network")) {
    return "Falha de conexão. Verifique a internet e tente de novo.";
  }
  return fallback + (e?.message ? ` (${e.message})` : "");
}

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
  const [recovery, setRecovery] = useState(false); // veio do link de recuperação de senha
  const [profile, setProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [incomingCount, setIncomingCount] = useState(0);
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
    const off = onAuthChange((s, event) => {
      setAuth(s);
      // Voltou do link de recuperação → abre a tela de nova senha.
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => { alive = false; off && off(); };
  }, []);

  // Carrega o meu profile (nome do time, escudo, cor) quando logo.
  // Depende do UID, não do objeto `auth`: o Supabase emite um novo objeto de sessão a
  // cada refresh de token/foco da aba, e refazer o fetch a cada evento trocava a
  // referência de `profile` no meio da edição (apagava o que você digitava).
  const authUid = auth?.user?.id || null;
  // Online (salas no Supabase) só para quem está LOGADO. Convidado joga em modo local.
  const useOnline = hasSupabase && !!authUid;
  useEffect(() => {
    if (!authUid) { setProfile(null); return; }
    let alive = true;
    getProfile(authUid).then((p) => alive && setProfile(p)).catch(() => {});
    return () => { alive = false; };
  }, [authUid]);

  // Conta pedidos de amizade recebidos (badge no botão de perfil). Recarrega ao
  // entrar/sair da tela de perfil (onde dá pra aceitar).
  useEffect(() => {
    if (!authUid) { setIncomingCount(0); return; }
    let alive = true;
    listFriendships(authUid).then((f) => alive && setIncomingCount(f.incoming.length)).catch(() => {});
    return () => { alive = false; };
  }, [authUid, showProfile]);

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

  // Meu jogador na sala (MODO LOCAL/blob). No online, a linha em room_players é montada
  // pelo net.js a partir do profileForRow abaixo.
  function makeMe(players, nameFallback) {
    const me = makePlayer(myId, profile?.display_name || nameFallback, players);
    if (profile) {
      if (profile.team_name) me.teamName = profile.team_name;
      if (profile.emoji) me.emoji = profile.emoji;
      if (profile.color) me.color = profile.color;
    }
    return me;
  }

  // Dados do meu room_players no online (vêm do profile; net.js completa defaults).
  function profileForRow(nameFallback) {
    return {
      team_name: profile?.team_name || `${(nameFallback || "Meu").split(" ")[0]} FC`,
      emoji: profile?.emoji || TEAM_EMOJIS[0],
      color: profile?.color || TEAM_COLORS[0],
    };
  }
  const DEFAULT_SETTINGS = { format: "knockout", modality: "pvp", difficulty: "classic", turnTimer: 30, squadPool: "all", bracketSize: 4, leagueSize: 6, cupSize: 8 };

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
      const local = !useOnline; // convidado → sala local
      let code = genCode();
      let tries = 0;
      while (tries < 6 && (await roomExists(code, { local }))) {
        code = genCode();
        tries++;
      }
      let initialState;
      if (useOnline) {
        // online relacional: net.js cria rooms + minha linha em room_players
        initialState = { phase: "lobby", settings: DEFAULT_SETTINGS };
      } else {
        // local/blob (convidado ou Supabase ausente)
        const host = makeMe([], name);
        initialState = {
          v: 1, code, hostId: myId, phase: "lobby",
          settings: DEFAULT_SETTINGS, players: [host],
          draft: null, tournament: null, presenting: null,
        };
      }
      const r = await openRoom(code, {
        create: true,
        local,
        initialState,
        myUid: myId,
        profile: profileForRow(name),
        presenceMeta: { cid: myId, name },
      });
      attach(r, name);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível criar a sala."));
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
        local: !useOnline,
        myUid: myId,
        profile: profileForRow(name),
        presenceMeta: { cid: myId, name },
      });
      // No online, net.js já inseriu minha linha em room_players. No local, adiciono ao blob.
      if (r.isLocal) {
        await r.setState((prev) => {
          if (!prev) return prev;
          if (prev.players.some((p) => p.id === myId)) return prev;
          return { ...prev, players: [...prev.players, makeMe(prev.players, name)] };
        });
      }
      attach(r, name);
    } catch (e) {
      setError(friendlyError(e, "Não foi possível entrar."));
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
        local: !useOnline,
        myUid: myId,
        profile: profileForRow(s.name),
        presenceMeta: { cid: myId, name: s.name },
      });
      if (r.isLocal) {
        await r.setState((prev) => {
          if (!prev) return prev;
          if (prev.players.some((p) => p.id === myId)) return prev;
          return { ...prev, players: [...prev.players, makeMe(prev.players, s.name)] };
        });
      }
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
  // Escrita de estado de MOTOR (draft/torneio/apresentação/fase). Reaproveita os mesmos
  // redutores: no local escreve o blob inteiro; no online faz diff e grava fase (coluna)
  // + estado de motor (rooms.state) separadamente. `fn(prev)` devolve o "próximo blob".
  const applyEngine = (fn) => {
    const r = roomRef.current;
    if (!r) return;
    if (r.isLocal) { r.setState(fn); return; }
    const prev = r.getState();
    const next = fn(prev);
    if (!next || next === prev) return;
    if (next.phase !== prev.phase) r.setPhase(next.phase);
    const engine = {};
    for (const k of ["draft", "tournament", "presenting", "tournamentToken", "draftToken"]) {
      if (next[k] !== prev[k]) engine[k] = next[k] ?? null;
    }
    if (Object.keys(engine).length) r.setEngine(engine);
  };

  const actions = {
    updateMe(patch) {
      const r = roomRef.current;
      if (r && !r.isLocal) {
        const cols = {};
        if (patch.teamName != null) cols.team_name = patch.teamName;
        if (patch.emoji != null) cols.emoji = patch.emoji;
        if (patch.color != null) cols.color = patch.color;
        r.updateMe(cols);
        return;
      }
      r.setState((prev) => ({
        ...prev,
        players: prev.players.map((p) => (p.id === myId ? { ...p, ...patch } : p)),
      }));
    },
    addLocalPlayer(name) {
      const r = roomRef.current;
      if (r && !r.isLocal) {
        const p = makePlayer("x", name, r.getState().players);
        r.addPlayerRow({ is_bot: false, user_id: null, team_name: name, emoji: p.emoji, color: p.color });
        return;
      }
      r.setState((prev) => {
        const id = "local_" + Math.random().toString(36).slice(2, 8);
        return { ...prev, players: [...prev.players, makePlayer(id, name, prev.players)] };
      });
    },
    addBot() {
      const r = roomRef.current;
      if (r && !r.isLocal) {
        const players = r.getState().players;
        if (players.length >= 16) return;
        const b = makeSquadBot(players);
        r.addPlayerRow({ is_bot: true, user_id: null, squad_slug: b.squadId, team_name: b.teamName, emoji: b.emoji, color: b.color });
        return;
      }
      r.setState((prev) => {
        if (prev.players.length >= 16) return prev;
        return { ...prev, players: [...prev.players, makeSquadBot(prev.players)] };
      });
    },
    removePlayer(id) {
      const r = roomRef.current;
      if (r && !r.isLocal) { r.removePlayer(id); return; }
      r.setState((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== id) }));
    },
    setSettings(patch) {
      const r = roomRef.current;
      if (r && !r.isLocal) { r.setSettings(patch); return; }
      r.setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    claimHost() {
      const r = roomRef.current;
      if (r && !r.isLocal) { r.claimHost(myId); return; }
      r.setState((prev) => ({ ...prev, hostId: myId }));
    },
    leave,
    startDraft() {
      const r = roomRef.current;
      // token estável por instância de draft — chave para gravar draft_picks no Supabase
      const draftToken = "d_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      const buildDraft = (players, settings) => {
        const humans = players.filter((p) => !p.isBot);
        const mgr = {};
        humans.forEach((p) => { mgr[p.id] = createManagerDraft(DEFAULT_FORMATION, settings.difficulty); });
        let draft = {
          taken: [], takenPersons: [], mgr,
          difficulty: settings.difficulty, turnTimer: settings.turnTimer || 30,
          pool: settings.squadPool || "all", done: false,
        };
        humans.forEach((p) => (draft = ensureRoll(draft, p.id)));
        return draft;
      };
      const targetFor = (settings, count) => {
        const fmt = settings.format;
        const targetN = fmt === "league" ? (settings.leagueSize || 6) : fmt === "cup" ? (settings.cupSize || 8) : (settings.bracketSize || 4);
        const floor = fmt === "cup" ? 6 : 2;
        return Math.min(16, Math.max(targetN, count, floor));
      };

      if (r && !r.isLocal) {
        const prev = r.getState();
        if (prev.players.filter((p) => !p.isBot).length < 1) return;
        // adiciona bots até o alvo (linhas em room_players)
        const local = [...prev.players];
        const target = targetFor(prev.settings, local.length);
        let guard = 0;
        while (local.length < target && guard < 32) {
          const b = makeSquadBot(local);
          r.addPlayerRow({ is_bot: true, user_id: null, squad_slug: b.squadId, team_name: b.teamName, emoji: b.emoji, color: b.color });
          local.push(b);
          guard++;
        }
        // o draft só precisa dos humanos atuais; o torneio (no fim) usa os players da sala
        const draft = buildDraft(prev.players, prev.settings);
        r.setEngine({ draft, draftToken });
        r.setPhase("draft");
        return;
      }

      r.setState((prev) => {
        if (prev.players.filter((p) => !p.isBot).length < 1) return prev;
        const target = targetFor(prev.settings, prev.players.length);
        const players = [...prev.players];
        let guard = 0;
        while (players.length < target && guard < 32) { players.push(makeSquadBot(players)); guard++; }
        const draft = buildDraft(players, prev.settings);
        return { ...prev, players, phase: "draft", draft, draftToken };
      });
    },
    // Envia uma intent de draft (aplica direto se for o controlador; senão, broadcast).
    dispatchDraft(intent) {
      const full = { ...intent, managerId: intent.managerId || myId };
      const controller = roomRef.current?.isLocal || roomRef.current?.getState()?.hostId === myId;
      if (controller) {
        applyEngine((prev) => applyDraftIntent(prev, full, prev.players, prev.settings));
      } else {
        roomRef.current?.broadcast?.("draft", full);
      }
    },
    simulateNext() {
      applyEngine((prev) => {
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
      applyEngine((prev) => {
        const fin = tournamentFinished(prev.tournament);
        return { ...prev, presenting: null, phase: fin ? "finished" : "tournament" };
      });
    },
    // Abre a partida 2D ao vivo (resultado é gerado pelo motor ao terminar).
    startLiveMatch(matchId) {
      // seed persistida na sala → a partida é reproduzível pela seed (replay/multiplayer)
      const seed = randomSeed();
      applyEngine((prev) => ({ ...prev, presenting: { matchId, mode: "live", ts: Date.now(), seed } }));
    },
    // T7: o anfitrião persiste o estado vivo (eng.serialize()) na sala a cada ~3s. Se ele
    // cair, o novo anfitrião reidrata a partida daqui (não recomeça do minuto 0).
    persistLive(serialized) {
      const r = roomRef.current;
      if (!r || r.isLocal) return;
      const st = r.getState();
      if (st?.hostId !== myId || st?.presenting?.mode !== "live") return; // só o host, em partida ao vivo
      r.setEngine({ presenting: { ...st.presenting, live: serialized } });
    },
    finishLiveMatch(matchId, result) {
      applyEngine((prev) => {
        if (!prev.tournament) return prev;
        const t = structuredClone(prev.tournament);
        applyMatchResult(t, matchId, result, prev.players);
        const fin = tournamentFinished(t);
        return { ...prev, tournament: t, presenting: null, phase: fin ? "finished" : "tournament" };
      });
    },
    simulateRound() {
      applyEngine((prev) => {
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
      applyEngine((prev) => {
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
      applyEngine((prev) => ({
        ...prev,
        phase: "lobby",
        draft: null,
        tournament: null,
        presenting: null,
        tournamentToken: null,
        draftToken: null,
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
      applyEngine((prev) => applyDraftIntent(prev, data, prev.players, prev.settings));
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
    // só humanos (não-bot) com id uuid viram user_id; bots têm rowId uuid mas não são profiles
    const sideOf = (id) => {
      const p = gstate.players.find((x) => x.id === id);
      const isHuman = p && !p.isBot && isUuid(id);
      return { userId: isHuman ? id : null, squad: p?.squadId || null };
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
        const champHuman = champ && !champ.isBot && isUuid(t.champion);
        history.setChampion({
          token,
          championUserId: champHuman ? t.champion : null,
          championSquad: champ?.squadId || null,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstate?.tournament, gstate?.tournamentToken, gstate?.hostId, auth, room, myId]);

  // A6/T6: espelha cada pick finalizado do draft em draft_picks (durável; o sorteio em
  // curso segue no rooms.state). Só o anfitrião grava; dedupe por manager+slot.
  const recordedPicksRef = useRef(new Set());
  useEffect(() => {
    if (!hasSupabase || !auth || !room || room.isLocal) return;
    if (gstate?.hostId !== myId) return;
    const d = gstate?.draft;
    const token = gstate?.draftToken;
    if (!d || !token || !d.mgr) return;
    const findPlayer = (id) => {
      for (const s of SQUADS) { const p = s.players.find((x) => x.id === id); if (p) return p; }
      return null;
    };
    let order = recordedPicksRef.current.size;
    for (const managerId of Object.keys(d.mgr)) {
      const slots = d.mgr[managerId].slots || {};
      for (const slotIdx of Object.keys(slots)) {
        const playerId = slots[slotIdx];
        if (!playerId) continue;
        const key = token + ":" + managerId + ":" + slotIdx;
        if (recordedPicksRef.current.has(key)) continue;
        recordedPicksRef.current.add(key);
        const pl = findPlayer(playerId);
        history.recordDraftPick({
          token, roomId: gstate.code, slot: Number(slotIdx),
          userId: managerId, squadSlug: pl?.squadId || null,
          playerId: pl?.personId || playerId, playerName: pl?.name || null,
          position: pl?.detail || pl?.pos || null, pickOrder: order++,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gstate?.draft, gstate?.draftToken, gstate?.hostId, auth, room, myId]);

  // T7: migração automática de anfitrião. Se o host sai (não está na presença) e a sala
  // segue ativa, o SUCESSOR (membro humano online de menor id — eleição determinística,
  // só um assume) toma o comando após 4s. A partida ao vivo reidrata do estado salvo.
  useEffect(() => {
    if (!hasSupabase || !room || room.isLocal || !gstate) return;
    const off = online.length > 0 && !online.includes(gstate.hostId);
    if (!off || gstate.hostId === myId) return;
    const successor = (gstate.players || [])
      .filter((p) => !p.isBot && p.id !== gstate.hostId && online.includes(p.id))
      .map((p) => p.id).sort()[0];
    if (successor !== myId) return; // não sou o sucessor
    const t = setTimeout(() => {
      if (roomRef.current?.getState()?.hostId !== myId) roomRef.current?.claimHost?.(myId);
    }, 4000);
    return () => clearTimeout(t);
  }, [online, gstate, myId, room]);

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

  // Veio do link de recuperação de senha → define a nova senha (tem prioridade).
  if (recovery && auth) {
    return (
      <div className="app app-full">
        <ResetPassword onDone={() => setRecovery(false)} />
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
          incomingRequests={incomingCount}
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
