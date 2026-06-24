import { useEffect, useRef, useState } from "react";
import { clientId, saveSession, loadSession, clearSession } from "./lib/id.js";
import { openRoom, roomExists, hasSupabase } from "./lib/net.js";
import { generatePool } from "./engine/players.js";
import { snakeOrder } from "./engine/draft.js";
import { simulateMatch } from "./engine/match.js";
import {
  createTournament,
  applyMatchResult,
  nextMatch,
  tournamentFinished,
} from "./engine/tournament.js";
import { TEAM_COLORS, TEAM_EMOJIS, Logo } from "./components/bits.jsx";
import Home from "./components/Home.jsx";
import Lobby from "./components/Lobby.jsx";
import Draft from "./components/Draft.jsx";
import Tournament from "./components/Tournament.jsx";
import Champion from "./components/Champion.jsx";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genCode() {
  let c = "";
  for (let i = 0; i < 4; i++) c += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return c;
}

function makePlayer(id, name, index) {
  const first = name.split(" ")[0] || "Time";
  return {
    id,
    name,
    teamName: `${first} FC`,
    emoji: TEAM_EMOJIS[index % TEAM_EMOJIS.length],
    color: TEAM_COLORS[index % TEAM_COLORS.length],
    joinedAt: Date.now() + index,
  };
}

function buildTeam(state, managerId) {
  const mgr = state.players.find((p) => p.id === managerId);
  const ids = state.draft?.picks[managerId] || [];
  const squad = ids.map((pid) => state.pool.find((pp) => pp.id === pid)).filter(Boolean);
  return { id: managerId, name: mgr?.teamName || "Time", squad };
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
  const roomRef = useRef(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

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
      const host = makePlayer(myId, name, 0);
      const initialState = {
        v: 1,
        code,
        hostId: myId,
        phase: "lobby",
        settings: { format: "knockout", squadSize: 5 },
        players: [host],
        pool: null,
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
        return { ...prev, players: [...prev.players, makePlayer(myId, name, prev.players.length)] };
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
        return { ...prev, players: [...prev.players, makePlayer(myId, s.name, prev.players.length)] };
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
        return { ...prev, players: [...prev.players, makePlayer(id, name, prev.players.length)] };
      });
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
        if (prev.players.length < 2) return prev;
        const ids = prev.players.map((p) => p.id);
        const squadSize = prev.settings.squadSize;
        const order = snakeOrder(ids, squadSize);
        const picks = {};
        ids.forEach((id) => (picks[id] = []));
        const poolSize = Math.min(220, Math.max(120, ids.length * squadSize + 60));
        const pool = generatePool(poolSize);
        return {
          ...prev,
          phase: "draft",
          pool,
          draft: { order, pickIndex: 0, picks, pickedSet: [], done: false },
        };
      });
    },
    pick(poolPlayerId) {
      setState((prev) => {
        const isLocal = roomRef.current?.isLocal;
        const d = structuredClone(prev.draft);
        const curId = d.order[d.pickIndex];
        if (!isLocal && curId !== myId) return prev; // não é sua vez
        if (d.pickedSet.includes(poolPlayerId)) return prev; // já escolhido
        const actor = isLocal ? curId : myId;
        d.picks[actor] = d.picks[actor] || [];
        d.picks[actor].push(poolPlayerId);
        d.pickedSet.push(poolPlayerId);
        d.pickIndex++;
        const next = { ...prev, draft: d };
        if (d.pickIndex >= d.order.length) {
          d.done = true;
          next.phase = "tournament";
          next.tournament = createTournament(prev.players, prev.settings);
        }
        return next;
      });
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
        pool: null,
        draft: null,
        tournament: null,
        presenting: null,
      }));
    },
  };

  // ---------- render ----------
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
      <div className="app">
        <Home
          onCreate={onCreate}
          onJoin={onJoin}
          onRejoin={onRejoin}
          session={session}
          connecting={connecting}
          error={error}
          isLocal={!hasSupabase}
        />
        <footer className="foot">FutDraft · {hasSupabase ? "online" : "modo local"}</footer>
      </div>
    );
  }

  const isHost = gstate.hostId === myId;
  const isLocal = !!room?.isLocal;
  const hostOffline = !isLocal && online.length > 0 && !online.includes(gstate.hostId);

  return (
    <div className="app">
      {gstate.phase === "lobby" && (
        <Lobby
          state={gstate}
          myId={myId}
          online={online}
          isHost={isHost}
          isLocal={isLocal}
          actions={actions}
          hostOffline={hostOffline}
        />
      )}
      {gstate.phase === "draft" && (
        <Draft state={gstate} myId={myId} isLocal={isLocal} actions={actions} />
      )}
      {gstate.phase === "tournament" && (
        <Tournament
          state={gstate}
          myId={myId}
          isHost={isHost}
          actions={actions}
          hostOffline={hostOffline}
        />
      )}
      {gstate.phase === "finished" && (
        <Champion state={gstate} myId={myId} isHost={isHost} actions={actions} />
      )}
    </div>
  );
}
