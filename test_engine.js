// Teste rápido do motor (rodar com: node test_engine.js). Não faz parte do build.
import { generatePool, POSITIONS } from "./src/engine/players.js";
import { formationsFor, autoLineup } from "./src/engine/formations.js";
import { REAL_PLAYERS } from "./src/engine/playersData.js";
import { WORLDCUP_SQUADS, squadXI } from "./src/data/worldcupSquads.js";
import { createManagerDraft, ensureRoll, autoStep, draftXI } from "./src/engine/draft7a0.js";
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
    const hasGK = picks[pickerId].some((pid) => pool.find((p) => p.id === pid)?.pos === "GK");
    const need = picks[pickerId].length === squadSize - 1 && !hasGK ? "GK" : null;
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

// === Pool real e formações ===
console.log("\n=== Pool real + formações ===");

// 1. Pool não repete jogadores e traz país/Copa/bandeira.
for (const theme of ["all", "modern", "legends"]) {
  const p = generatePool(160, { theme });
  const ids = new Set(p.map((x) => x.id));
  if (ids.size !== p.length) throw new Error(`pool '${theme}' tem id repetido`);
  if (!p.every((x) => x.country && x.cup && x.flag && POSITIONS.includes(x.pos)))
    throw new Error(`pool '${theme}' com jogador sem país/copa/bandeira/pos`);
  const reais = p.filter((x) => x.id.startsWith("r")).length;
  console.log(`OK  tema=${theme.padEnd(7)} | ${p.length} jogadores | ${reais} reais`);
}
console.log(`Total de craques reais no dataset: ${REAL_PLAYERS.length}`);

// 2. Toda formação (11 slots) preenche exatamente seus slots a partir de um elenco real.
{
  const squad = generatePool(160).slice(0, 16);
  for (const f of formationsFor()) {
    if (f.slots.length !== 11) throw new Error(`formação ${f.name} não tem 11 slots`);
    const lu = autoLineup(squad, f);
    if (lu.starters.length !== 11) throw new Error(`formação ${f.name} não preencheu 11 slots`);
    if (new Set(lu.starters).size !== 11) throw new Error(`formação ${f.name} repetiu jogador`);
  }
  console.log(`OK  formações (11) | ${formationsFor().map((f) => f.name).join(", ")}`);
}

// === Seleções reais (worldcupSquads) ===
console.log("\n=== Seleções reais + draft 7a0 ===");
{
  const GROUPS = ["GK", "DEF", "MID", "ATT"];
  for (const sq of WORLDCUP_SQUADS) {
    const ids = new Set(sq.players.map((p) => p.id));
    if (ids.size !== sq.players.length) throw new Error(`${sq.id} tem id repetido`);
    if (!sq.players.every((p) => GROUPS.includes(p.pos))) throw new Error(`${sq.id} com pos inválida`);
    if (!sq.players.some((p) => p.pos === "GK")) throw new Error(`${sq.id} sem goleiro`);
    // consegue montar XI completo em todas as formações
    for (const f of formationsFor()) {
      const xi = squadXI(sq, f);
      if (xi.length !== 11) throw new Error(`${sq.id} não monta XI em ${f.name}`);
      if (new Set(xi.map((p) => p.id)).size !== 11) throw new Error(`${sq.id} XI repetiu em ${f.name}`);
    }
  }
  console.log(`OK  ${WORLDCUP_SQUADS.length} seleções reais íntegras (XI em todas as formações)`);
}

// Draft 7a0: dois técnicos draftam até completar; jogador único por sala; regra de ouro.
{
  let d = {
    taken: [], difficulty: "classic", turnTimer: 30, done: false,
    mgr: { A: createManagerDraft("4-3-3", "classic"), B: createManagerDraft("4-4-2", "classic") },
  };
  d = ensureRoll(d, "A");
  d = ensureRoll(d, "B");
  let guard = 0;
  while (!d.done && guard < 500) {
    if (!d.mgr.A.done) d = autoStep(d, "A");
    if (!d.mgr.B.done) d = autoStep(d, "B");
    guard++;
  }
  const xiA = draftXI(d.mgr.A);
  const xiB = draftXI(d.mgr.B);
  if (xiA.length !== 11 || xiB.length !== 11) throw new Error("draft não completou 11+11");
  const all = [...xiA, ...xiB].map((p) => p.id);
  if (new Set(all).size !== all.length) throw new Error("jogador repetido entre técnicos (unicidade falhou)");
  if (d.taken.length !== 22) throw new Error(`taken inconsistente: ${d.taken.length}`);
  console.log(`OK  draft 7a0: A(${xiA.length}) + B(${xiB.length}) = 22 jogadores únicos`);
}

console.log("\nTodos os testes passaram. ✓");
