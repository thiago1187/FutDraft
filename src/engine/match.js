// Simulação de uma partida a partir dos elencos (squads) de cada time.
// Usa EXATAMENTE o mesmo λ Dixon-Coles do motor ao vivo (rates.js): campo neutro,
// SEM vantagem de mando. Assim "simular" e "assistir" convergem (relatório §4/§7).

import { computeLambdas } from "./rates.js";
import { mulberry32, randomSeed } from "./rng.js";

function avg(arr) {
  return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0;
}
function round1(x) {
  return Math.round(x * 10) / 10;
}

// Calcula ataque/defesa de um time a partir do elenco.
export function teamRatings(squad) {
  const all = squad.map((p) => p.ovr);
  const overall = avg(all) || 60;
  const atk = squad.filter((p) => p.pos === "ATT").map((p) => p.ovr);
  const mid = squad.filter((p) => p.pos === "MID").map((p) => p.ovr);
  const def = squad.filter((p) => p.pos === "DEF").map((p) => p.ovr);
  const gks = squad.filter((p) => p.pos === "GK").map((p) => p.ovr);

  const A = atk.length ? avg(atk) : overall - 3;
  const M = mid.length ? avg(mid) : overall - 3;
  const D = def.length ? avg(def) : overall - 3;
  const G = gks.length ? Math.max(...gks) : overall - 7; // sem goleiro: penalidade

  const attack = A * 0.62 + M * 0.38;
  const defense = D * 0.5 + G * 0.32 + M * 0.18;
  return { attack, defense, overall, A, M, D, G };
}

// Número de gols ~ Poisson(lambda) (algoritmo de Knuth).
function poisson(lambda, rng) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

// Peso de cada jogador para marcar gols.
function scorerWeight(p) {
  switch (p.pos) {
    case "ATT":
      return p.ovr * p.ovr * 0.02;
    case "MID":
      return p.ovr * 0.9;
    case "DEF":
      return p.ovr * 0.12;
    case "GK":
      return 0.02;
    default:
      return p.ovr * 0.3;
  }
}

function pickScorer(squad, rng) {
  if (!squad.length) return null;
  const weights = squad.map(scorerWeight);
  const total = weights.reduce((s, x) => s + x, 0);
  if (total <= 0) return squad[Math.floor(rng() * squad.length)];
  let r = rng() * total;
  for (let i = 0; i < squad.length; i++) {
    r -= weights[i];
    if (r <= 0) return squad[i];
  }
  return squad[squad.length - 1];
}

function kickProb(squad) {
  const r = teamRatings(squad);
  return Math.min(0.92, Math.max(0.55, 0.62 + (r.overall - 70) / 120));
}

// Disputa de pênaltis: 5 cobranças + morte súbita.
function shootout(home, away, rng) {
  let h = 0;
  let a = 0;
  const ph = kickProb(home.squad);
  const pa = kickProb(away.squad);
  const order = [];
  for (let i = 0; i < 5; i++) {
    const sh = rng() < ph;
    const sa = rng() < pa;
    if (sh) h++;
    if (sa) a++;
    order.push({ side: "home", scored: sh }, { side: "away", scored: sa });
  }
  let guard = 0;
  while (h === a && guard < 20) {
    const sh = rng() < ph;
    const sa = rng() < pa;
    if (sh) h++;
    if (sa) a++;
    order.push({ side: "home", scored: sh }, { side: "away", scored: sa });
    guard++;
  }
  return { home: h, away: a, order };
}

// Choque de forma por partida (lognormal, média 1) — variância/zebra (relatório §6.6).
function formShock(rng) {
  let u = 0, v = 0;
  while (!u) u = rng();
  while (!v) v = rng();
  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  const SIGMA = 0.13;
  return Math.exp(SIGMA * z - (SIGMA * SIGMA) / 2);
}

// Monta um estado mínimo p/ reusar o λ do motor ao vivo (Dixon-Coles, campo neutro).
function lambdasFor(home, away, rng) {
  const toTokens = (squad) => squad.map((p) => ({ ...p, stamina: 100, out: false }));
  const eq = { posture: "equilibrado", marking: "leve", build: 0.4 };
  const state = {
    tokens: { home: toTokens(home.squad), away: toTokens(away.squad) },
    tactics: { home: { ...eq }, away: { ...eq } },
    men: { home: 11, away: 11 },
    score: [0, 0], minute: 0,
    form: { home: formShock(rng), away: formShock(rng) },
  };
  return computeLambdas(state); // { home, away } — simétrico, SEM termo de mando
}

// Simula a partida. home/away = { id, name, squad: [players] }. `seed` torna o
// resultado reproduzível (mesma seed → mesmo placar); sem seed, sorteia uma.
export function simulateMatch(home, away, { knockout = false, seed } = {}) {
  const rng = mulberry32((seed ?? randomSeed()) >>> 0);
  const lam = lambdasFor(home, away, rng); // campo neutro, sem vantagem de casa
  const xgH = lam.home;
  const xgA = lam.away;

  const gh = poisson(xgH, rng);
  const ga = poisson(xgA, rng);

  const goals = [];
  function addGoals(n, side, team) {
    for (let i = 0; i < n; i++) {
      const minute = 1 + Math.floor(rng() * 90);
      const scorer = pickScorer(team.squad, rng);
      goals.push({ minute, side, scorer });
    }
  }
  addGoals(gh, "home", home);
  addGoals(ga, "away", away);
  goals.sort((x, y) => x.minute - y.minute);

  const events = [];
  let rH = 0;
  let rA = 0;
  for (const g of goals) {
    if (g.side === "home") rH++;
    else rA++;
    events.push({
      minute: g.minute,
      type: "goal",
      side: g.side,
      scorer: g.scorer ? g.scorer.name : "Gol contra",
      scorerId: g.scorer ? g.scorer.id : null,
      score: [rH, rA],
    });
  }

  let winner;
  if (gh > ga) winner = "home";
  else if (ga > gh) winner = "away";
  else winner = "draw";

  let pens = null;
  if (knockout && winner === "draw") {
    pens = shootout(home, away, rng);
    winner = pens.home > pens.away ? "home" : "away";
  }

  return {
    homeGoals: gh,
    awayGoals: ga,
    events,
    pens,
    winner,
    xg: [round1(xgH), round1(xgA)],
  };
}
