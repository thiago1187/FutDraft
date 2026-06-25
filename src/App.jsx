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
} from "./engine/tournament.js";
import { TEAM_EMOJIS, freeColor, Logo } from "./components/bits.jsx";
import Home from "./components/Home.jsx";
import Lobby from "./components/Lobby.jsx";
import Draft7a0 from "./components/Draft7a0.jsx";
import Tournament from "./components/Tournament.jsx";
import Champion from "./components/Champion.jsx";
import DevHarness from "./components/DevHarness.jsx";

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
  const myId = useRef(clientId()).current;
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
      const host = makePlayer(myId, name, []);
      const initialState = {
        v: 1,
        code,
        hostId: myId,
        phase: "lobby",
        settings: { format: "knockout", modality: "pvp", difficulty: "classic", turnTimer: 30, squadPool: "all", bracketSize: 4, leagueSize: 6 },
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
        return { ...prev, players: [...prev.players, makePlayer(myId, name, prev.players)] };
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
        return { ...prev, players: [...prev.players, makePlayer(myId, s.name, prev.players)] };
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
        // Auto-preenche as vagas com seleções-bot aleatórias até o alvo:
        // mata-mata usa o tamanho da chave; pontos corridos usa a quantidade escolhida.
        const targetN = prev.settings.format === "league" ? (prev.settings.leagueSize || 6) : (prev.settings.bracketSize || 4);
        const target = Math.min(16, Math.max(targetN, prev.players.length));
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
        const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), {
          knockout: t.format === "knockout",
        });
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
        if (t.format === "knockout") {
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
          const result = simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), {
            knockout: t.format === "knockout",
          });
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

  // ---------- render ----------
  if (dev) return <DevHarness onExit={() => setDev(false)} />;

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
