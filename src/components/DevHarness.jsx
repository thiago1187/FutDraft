import { useMemo, useState } from "react";
import Home from "./Home.jsx";
import Lobby from "./Lobby.jsx";
import Draft7a0 from "./Draft7a0.jsx";
import MatchLive from "./MatchLive.jsx";
import Tournament from "./Tournament.jsx";
import Champion from "./Champion.jsx";
import { buildTeam } from "../engine/team.js";
import { createManagerDraft, ensureRoll, autoStep, applyReroll, applyPick, applyMove } from "../engine/draft7a0.js";
import { SQUADS, setSquads, isSquadsLoaded } from "../data/squads.js";
import { WORLDCUP_SQUADS } from "../data/worldcupSquads.js";
import { createTournament, applyMatchResult, nextMatch, allMatches } from "../engine/tournament.js";
import { simulateMatch } from "../engine/match.js";

// Semeia as seleções estáticas SÓ quando o modo dev é aberto e ainda não há dados
// reais do Supabase. NÃO pode rodar em escopo de módulo: como App.jsx importa o
// DevHarness no topo, isso marcaria _loaded=true e faria loadSquads() pular o fetch
// do Supabase — o app inteiro acabava usando o dataset estático de 12 jogadores.
function seedDevSquads() {
  if (!isSquadsLoaded()) setSquads(WORLDCUP_SQUADS);
}

const SCREENS = [
  ["home", "Home (início)"],
  ["lobby", "Lobby (sala)"],
  ["draft", "Draft 7a0"],
  ["match", "Partida 2D (simulação)"],
  ["pens", "Pênaltis"],
  ["tournament", "Campeonato (chaveamento)"],
  ["champion", "Campeão (com 7×0)"],
];

const MOCK_ROOM = { isLocal: true, broadcast() {}, onBroadcast() { return () => {}; } };

function mockPlayers() {
  const cores = ["#2b5ba8", "#3f9c63", "#ffd23f"];
  return [
    { id: "h", name: "Você", teamName: "Seu Time FC", emoji: "🦁", color: "#e94e27" },
    ...SQUADS.slice(0, 3).map((s, i) => ({
      id: "b" + i, name: "CPU", teamName: `${s.country} ${s.year}`,
      emoji: s.flag, color: cores[i], isBot: true, squadId: s.id, flag: s.flag,
    })),
  ];
}

function makeDraft(steps) {
  let d = { taken: [], difficulty: "classic", turnTimer: 30, done: false, mgr: { h: createManagerDraft("4-3-3", "classic") } };
  d = ensureRoll(d, "h");
  let g = 0;
  while (g < steps && !d.mgr.h.done) { d = autoStep(d, "h"); g++; }
  if (!d.mgr.h.done) d = ensureRoll(d, "h");
  return d;
}

function reduceDraft(d, intent) {
  const id = intent.managerId || "h";
  switch (intent.kind) {
    case "formation": {
      const nd = structuredClone(d);
      if (nd.mgr[id] && Object.keys(nd.mgr[id].slots).length === 0) nd.mgr[id].formation = intent.formation;
      return nd;
    }
    case "reroll": return applyReroll(d, id, intent.rerollKind);
    case "pick": return applyPick(d, id, intent.playerId, intent.slotIndex);
    case "move": return applyMove(d, id, intent.from, intent.to);
    case "auto": return autoStep(d, id);
    default: return d;
  }
}

export default function DevHarness({ onExit }) {
  seedDevSquads(); // semeia dados estáticos só agora (dev aberto), nunca no load do app
  const [screen, setScreen] = useState("home");

  // estados mock interativos
  const [lobbyState, setLobbyState] = useState(() => ({
    code: "DEV1", hostId: "h",
    settings: { modality: "pvp", difficulty: "classic", format: "knockout", turnTimer: 30, squadPool: "all", bracketSize: 8 },
    players: mockPlayers(),
  }));
  const [draftState, setDraftState] = useState(() => ({
    players: mockPlayers(), settings: { difficulty: "classic" }, draft: makeDraft(3),
  }));

  // times prontos (humano draftado + bot) para partida/pênaltis
  const matchState = useMemo(() => {
    const players = [mockPlayers()[0], { ...mockPlayers()[1] }];
    return { players, settings: {}, draft: makeDraft(99) };
  }, []);
  const home = useMemo(() => buildTeam(matchState, "h"), [matchState]);
  const away = useMemo(() => buildTeam(matchState, "b0"), [matchState]);

  // torneio mock (parcialmente jogado, INTERATIVO p/ testar o calendário) + campeão com 7×0
  const [tournamentState, setTournamentState] = useState(() => buildTournament(false));
  const championState = useMemo(() => buildTournament(true), []);

  const lobbyActions = {
    setSettings: (patch) => setLobbyState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    addBot: () => setLobbyState((s) => {
      const used = s.players.filter((p) => p.squadId).map((p) => p.squadId);
      const avail = SQUADS.filter((x) => !used.includes(x.id));
      const sq = (avail[0] || SQUADS[0]);
      return { ...s, players: [...s.players, { id: "b" + Math.random().toString(36).slice(2, 6), name: "CPU", teamName: `${sq.country} ${sq.year}`, emoji: "🌍", color: "#c77dff", isBot: true, squadId: sq.id, flag: sq.flag }] };
    }),
    addLocalPlayer: (n) => setLobbyState((s) => ({ ...s, players: [...s.players, { id: "l" + Math.random().toString(36).slice(2, 6), name: n, teamName: `${n} FC`, emoji: "⚽", color: "#34e0c4" }] })),
    removePlayer: (id) => setLobbyState((s) => ({ ...s, players: s.players.filter((p) => p.id !== id) })),
    updateMe: (patch) => setLobbyState((s) => ({ ...s, players: s.players.map((p) => p.id === "h" ? { ...p, ...patch } : p) })),
    claimHost: () => {}, startDraft: () => setScreen("draft"), leave: onExit,
  };

  const draftActions = {
    dispatchDraft: (intent) => setDraftState((s) => ({ ...s, draft: reduceDraft(s.draft, intent) })),
  };

  // Simulação real sobre o estado mock (permite testar o calendário no DEV).
  const devHasHuman = (prev, m) => {
    const h = prev.players.find((p) => p.id === m.homeId);
    const a = prev.players.find((p) => p.id === m.awayId);
    return (h && !h.isBot) || (a && !a.isBot);
  };
  const devSim = (mutate) => setTournamentState((prev) => {
    const t = structuredClone(prev.tournament);
    mutate(t, prev);
    return { ...prev, tournament: t };
  });
  const devPlay = (t, prev, m) =>
    applyMatchResult(t, m.id, simulateMatch(buildTeam(prev, m.homeId), buildTeam(prev, m.awayId), { knockout: true }), prev.players);
  const tourActions = {
    startLiveMatch: () => setScreen("match"),
    simulateNext: () => devSim((t, prev) => { const m = nextMatch(t); if (m) devPlay(t, prev, m); }),
    simulateRound: () => devSim((t, prev) => { const m0 = nextMatch(t); if (!m0) return; const ri = t.rounds.findIndex((r) => r.some((x) => x.id === m0.id)); for (const m of t.rounds[ri]) if (!m.played && !m.isBye) devPlay(t, prev, m); }),
    simulateAll: () => devSim((t, prev) => { let g = 0; while (nextMatch(t) && g < 30) { devPlay(t, prev, nextMatch(t)); g++; } }),
    simulateUpTo: (id) => devSim((t, prev) => { let g = 0; while (g < 30) { const m = nextMatch(t); if (!m || m.id === id || devHasHuman(prev, m)) break; devPlay(t, prev, m); g++; } }),
    advanceToMyGame: () => devSim((t, prev) => { let g = 0; while (g < 30) { const m = nextMatch(t); if (!m || devHasHuman(prev, m)) break; devPlay(t, prev, m); g++; } }),
    finishLiveMatch: () => {}, continueAfterMatch: () => {}, claimHost: () => {},
  };

  return (
    <div className="app dev-app">
      <div className="dev-bar">
        <span className="dev-bar-tag">🛠 DEV</span>
        <select className="dev-bar-select" value={screen} onChange={(e) => setScreen(e.target.value)}>
          {SCREENS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
        <div className="dev-bar-spacer" />
        <button className="dev-bar-exit" onClick={onExit}>✕ Sair do DEV</button>
      </div>

      <div className="dev-stage">
        {screen === "home" && (
          <div className="app app-full" style={{ minHeight: "auto" }}>
            <Home onCreate={() => {}} onJoin={() => {}} onRejoin={() => {}} session={null} connecting={false} error="" isLocal={false} />
          </div>
        )}
        {screen === "lobby" && (
          <div className="app app-full" style={{ minHeight: "auto" }}>
            <Lobby state={lobbyState} myId="h" online={["h", "b0", "b1", "b2"]} isHost isLocal={false} actions={lobbyActions} hostOffline={false} squadsReady squadsError="" />
          </div>
        )}
        {screen === "draft" && (
          <div className="app" style={{ minHeight: "auto" }}>
            <Draft7a0 state={draftState} myId="h" isLocal isHost actions={draftActions} />
          </div>
        )}
        {screen === "match" && (
          <MatchLive key="m" match={{ id: "dev", knockout: true }} home={home} away={away}
            homeMgr={matchState.players[0]} awayMgr={matchState.players[1]} myId="h" isHost isLocal room={MOCK_ROOM} onFinish={() => {}} />
        )}
        {screen === "pens" && (
          <MatchLive key="p" match={{ id: "devp", knockout: true }} home={home} away={away}
            homeMgr={matchState.players[0]} awayMgr={matchState.players[1]} myId="h" isHost isLocal room={MOCK_ROOM} onFinish={() => {}} forcePens />
        )}
        {screen === "tournament" && (
          <div className="app" style={{ minHeight: "auto" }}>
            <Tournament state={tournamentState} myId="h" isHost isLocal={false} room={MOCK_ROOM} actions={tourActions} hostOffline={false} />
          </div>
        )}
        {screen === "champion" && (
          <div className="app" style={{ minHeight: "auto" }}>
            <Champion state={championState} myId="h" isHost actions={{ playAgain: () => setScreen("home"), leave: onExit }} />
          </div>
        )}
      </div>
    </div>
  );
}

// Constrói um torneio mata-mata mock; se `finished`, joga tudo e crava um 7×0 do campeão.
function buildTournament(finished) {
  const players = mockPlayers();
  const state = { players, settings: { format: "knockout" }, draft: makeDraft(99) };
  // garante elenco para todos (humano draftado; bots = seleção)
  const draftAll = { taken: [], difficulty: "classic", turnTimer: 30, done: false, mgr: {} };
  state.draft = draftAll; // bots não usam draft; humano sim
  state.draft = (() => { let d = { taken: [], difficulty: "classic", turnTimer: 30, done: false, mgr: { h: createManagerDraft("4-3-3", "classic") } }; d = ensureRoll(d, "h"); let g = 0; while (!d.mgr.h.done && g < 99) { d = autoStep(d, "h"); g++; } return d; })();

  let t = createTournament(players, state.settings);
  if (finished) {
    let guard = 0;
    while (nextMatch(t) && guard < 30) {
      const m = nextMatch(t);
      const res = simulateMatch(buildTeam(state, m.homeId), buildTeam(state, m.awayId), { knockout: true });
      applyMatchResult(t, m.id, res, players);
      guard++;
    }
    // crava um 7×0 do campeão para exibir o selo
    const champ = t.champion;
    for (const m of allMatches(t)) {
      if (m.played && (m.homeId === champ || m.awayId === champ)) {
        if (m.homeId === champ) m.result = { ...m.result, homeGoals: 7, awayGoals: 0, winner: "home" };
        else m.result = { ...m.result, homeGoals: 0, awayGoals: 7, winner: "away" };
        break;
      }
    }
  } else {
    // joga só a primeira partida, deixando uma "próxima" para testar o botão
    const m = nextMatch(t);
    if (m) {
      const res = simulateMatch(buildTeam(state, m.homeId), buildTeam(state, m.awayId), { knockout: true });
      applyMatchResult(t, m.id, res, players);
    }
  }
  return { ...state, tournament: t };
}
