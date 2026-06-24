// Teste rápido do motor (rodar com: node test_engine.js). Não faz parte do build.
import { generatePool, POSITIONS } from "./src/engine/players.js";
import { snakeOrder } from "./src/engine/draft.js";
import { simulateMatch } from "./src/engine/match.js";
import {
  createTournament,
  applyMatchResult,
  nextMatch,
  tournamentFinished,
  topScorers,
  leagueTable,
  allMatches,
} from "./src/engine/tournament.js";

function fakeManagers(n) {
  return Array.from({ length: n }, (_, i) => ({
    id: "mgr" + i,
    name: "Tec" + i,
    teamName: "Time " + i,
  }));
}

function runDraft(managers, pool, squadSize) {
  const ids = managers.map((m) => m.id);
  const order = snakeOrder(ids, squadSize);
  const picks = {};
  ids.forEach((id) => (picks[id] = []));
  const taken = new Set();
  let pi = 0;
  // estratégia boba: cada técnico pega o melhor disponível respeitando 1 goleiro.
  for (const pickerId of order) {
    const hasGK = picks[pickerId].some((pid) => pool.find((p) => p.id === pid)?.pos === "GOL");
    const need = picks[pickerId].length === squadSize - 1 && !hasGK ? "GOL" : null;
    const avail = pool
      .filter((p) => !taken.has(p.id) && (!need || p.pos === need))
      .sort((a, b) => b.ovr - a.ovr);
    const choice = avail[0] || pool.find((p) => !taken.has(p.id));
    taken.add(choice.id);
    picks[pickerId].push(choice.id);
    pi++;
  }
  return picks;
}

function buildTeam(managers, picks, pool, id) {
  const mgr = managers.find((m) => m.id === id);
  const squad = (picks[id] || []).map((pid) => pool.find((p) => p.id === pid)).filter(Boolean);
  return { id, name: mgr.teamName, squad };
}

function playTournament(format, n, squadSize) {
  const managers = fakeManagers(n);
  const pool = generatePool(Math.max(160, n * squadSize + 60));
  const picks = runDraft(managers, pool, squadSize);
  // verifica que todos têm squadSize jogadores e nenhum repetido
  const all = [];
  for (const m of managers) {
    if (picks[m.id].length !== squadSize) throw new Error(`squad errado p/ ${m.id}: ${picks[m.id].length}`);
    all.push(...picks[m.id]);
  }
  if (new Set(all).size !== all.length) throw new Error("jogador repetido no draft!");

  let t = createTournament(managers, { format });
  let guard = 0;
  while (!tournamentFinished(t) && guard < 1000) {
    const mt = nextMatch(t);
    if (!mt) break;
    const home = buildTeam(managers, picks, pool, mt.homeId);
    const away = buildTeam(managers, picks, pool, mt.awayId);
    const result = simulateMatch(home, away, { knockout: format === "knockout" });
    applyMatchResult(t, mt.id, result, managers);
    guard++;
  }
  const played = allMatches(t).filter((m) => m.played).length;
  const champ = t.champion;
  const scorers = topScorers(t);
  const out = {
    format,
    n,
    squadSize,
    totalMatches: allMatches(t).length,
    played,
    finished: tournamentFinished(t),
    champion: champ,
    topScorer: scorers[0] ? `${scorers[0].name} (${scorers[0].goals})` : "—",
  };
  if (format === "league") {
    const table = leagueTable(t, managers);
    out.tableTop = table[0] ? `${table[0].id} ${table[0].Pts}pts` : "—";
    out.tableComplete = table.every((r) => r.P === n - 1);
  }
  return out;
}

console.log("=== Testes do motor ===");
for (const n of [2, 3, 4, 5, 6, 7, 8]) {
  for (const fmt of ["knockout", "league"]) {
    for (const sq of [5, 11]) {
      const r = playTournament(fmt, n, sq);
      const ok = r.finished && r.champion;
      console.log(
        `${ok ? "OK " : "XX "} ${fmt.padEnd(9)} n=${n} sq=${sq} | ${r.played}/${r.totalMatches} jogos | campeão=${r.champion} | artilheiro=${r.topScorer}`
      );
      if (!ok) throw new Error("torneio não finalizou corretamente");
    }
  }
}

// Distribuição de placares para sanidade
let goals = 0;
let games = 0;
const pool = generatePool(80);
for (let i = 0; i < 500; i++) {
  const home = { id: "a", name: "A", squad: pool.slice(0, 11) };
  const away = { id: "b", name: "B", squad: pool.slice(11, 22) };
  const r = simulateMatch(home, away, { knockout: false });
  goals += r.homeGoals + r.awayGoals;
  games++;
}
console.log(`\nMédia de gols por jogo (amostra 500): ${(goals / games).toFixed(2)}`);
console.log("\nTodos os testes passaram. ✓");
