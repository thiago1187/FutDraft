// Simulação de uma partida a partir dos elencos (squads) de cada time.

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
  const atk = squad.filter((p) => p.pos === "ATA").map((p) => p.ovr);
  const mid = squad.filter((p) => p.pos === "MEI").map((p) => p.ovr);
  const def = squad.filter((p) => p.pos === "ZAG").map((p) => p.ovr);
  const gks = squad.filter((p) => p.pos === "GOL").map((p) => p.ovr);

  const A = atk.length ? avg(atk) : overall - 3;
  const M = mid.length ? avg(mid) : overall - 3;
  const D = def.length ? avg(def) : overall - 3;
  const G = gks.length ? Math.max(...gks) : overall - 7; // sem goleiro: penalidade

  const attack = A * 0.62 + M * 0.38;
  const defense = D * 0.5 + G * 0.32 + M * 0.18;
  return { attack, defense, overall, A, M, D, G };
}

// Número de gols ~ Poisson(lambda) (algoritmo de Knuth).
function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Peso de cada jogador para marcar gols.
function scorerWeight(p) {
  switch (p.pos) {
    case "ATA":
      return p.ovr * p.ovr * 0.02;
    case "MEI":
      return p.ovr * 0.9;
    case "ZAG":
      return p.ovr * 0.12;
    case "GOL":
      return 0.02;
    default:
      return p.ovr * 0.3;
  }
}

function pickScorer(squad) {
  if (!squad.length) return null;
  const weights = squad.map(scorerWeight);
  const total = weights.reduce((s, x) => s + x, 0);
  if (total <= 0) return squad[Math.floor(Math.random() * squad.length)];
  let r = Math.random() * total;
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
function shootout(home, away) {
  let h = 0;
  let a = 0;
  const ph = kickProb(home.squad);
  const pa = kickProb(away.squad);
  const order = [];
  for (let i = 0; i < 5; i++) {
    const sh = Math.random() < ph;
    const sa = Math.random() < pa;
    if (sh) h++;
    if (sa) a++;
    order.push({ side: "home", scored: sh }, { side: "away", scored: sa });
  }
  let guard = 0;
  while (h === a && guard < 20) {
    const sh = Math.random() < ph;
    const sa = Math.random() < pa;
    if (sh) h++;
    if (sa) a++;
    order.push({ side: "home", scored: sh }, { side: "away", scored: sa });
    guard++;
  }
  return { home: h, away: a, order };
}

// Simula a partida. home/away = { id, name, squad: [players] }.
export function simulateMatch(home, away, { knockout = false, neutral = true } = {}) {
  const rh = teamRatings(home.squad);
  const ra = teamRatings(away.squad);
  const homeAdv = neutral ? 0.08 : 0.25;

  let xgH = 1.3 + (rh.attack - ra.defense) / 13 + homeAdv;
  let xgA = 1.3 + (ra.attack - rh.defense) / 13;
  xgH = Math.min(5.5, Math.max(0.22, xgH));
  xgA = Math.min(5.5, Math.max(0.22, xgA));

  const gh = poisson(xgH);
  const ga = poisson(xgA);

  const goals = [];
  function addGoals(n, side, team) {
    for (let i = 0; i < n; i++) {
      const minute = 1 + Math.floor(Math.random() * 90);
      const scorer = pickScorer(team.squad);
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
    pens = shootout(home, away);
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
