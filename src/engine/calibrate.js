// Harness de calibração de realismo (npm run sim:calibrate).
// Roda partidas em massa nos DOIS caminhos (sim rápida = torneio; motor ao vivo = 2D),
// agrega as distribuições e compara com os ALVOS reais do brief (§12). Emite um
// relatório de desvios (alvo vs obtido) com PASS/FAIL — é o trava-realismo para
// mudanças futuras não quebrarem o motor.
//
// Uso:  node src/engine/calibrate.js [Nrapida] [Nvivo]
//
// NÃO usa DOM nem Supabase: monta elencos sintéticos por overall.

import { createLiveMatch } from "./liveMatch.js";
import { simulateMatch } from "./match.js";
import { computeLambdas } from "./rates.js";
import { winProb } from "./winprob.js";
import { findFormation } from "./formations.js";

const N_QUICK = Number(process.argv[2]) || 20000; // sim rápida (rápida → N alto)
const N_LIVE = Number(process.argv[3]) || 1500;   // motor ao vivo (mais lento)

// ---------- elencos sintéticos ----------
const SLOTS = [
  ["GOL", "GK"], ["LE", "DEF"], ["ZAG", "DEF"], ["ZAG", "DEF"], ["LD", "DEF"],
  ["VOL", "MID"], ["MC", "MID"], ["MEI", "MID"], ["PE", "ATT"], ["CA", "ATT"], ["PD", "ATT"],
];
let uid = 0;
function squad(ovr, jitter = 3) {
  return SLOTS.map(([detail, pos]) => {
    const o = Math.max(50, Math.min(99, Math.round(ovr + (Math.random() * 2 - 1) * jitter)));
    return { id: "p" + uid++, name: detail, pos, detail, ovr: o, flag: "" };
  });
}
function liveTeam(ovr) {
  return { name: "T", bench: [], lineup: { formation: findFormation(11, "4-3-3") }, squad: squad(ovr) };
}

// ---------- util ----------
const pctStr = (x) => (x * 100).toFixed(1) + "%";
const within = (v, lo, hi) => v >= lo && v <= hi;
function line(label, got, target, ok) {
  const tag = ok ? "PASS" : "FALHA";
  console.log(`  [${tag}] ${label.padEnd(34)} obtido=${String(got).padStart(8)}   alvo: ${target}`);
  return ok;
}

// ========== 1) SIM RÁPIDA (torneio / "simular tudo") ==========
function calibQuick() {
  console.log(`\n=== SIM RÁPIDA (match.js) — ${N_QUICK} jogos por confronto ===`);
  let pass = true;

  // 1a) times iguais: simetria (sem mando), gols, empates, goleadas
  {
    let hw = 0, aw = 0, dr = 0, G = 0, big = 0;
    for (let i = 0; i < N_QUICK; i++) {
      const r = simulateMatch({ squad: squad(80) }, { squad: squad(80) }, { knockout: false });
      G += r.homeGoals + r.awayGoals;
      if (r.homeGoals + r.awayGoals >= 7) big++;
      if (r.winner === "home") hw++; else if (r.winner === "away") aw++; else dr++;
    }
    const homeW = hw / N_QUICK, awayW = aw / N_QUICK, draw = dr / N_QUICK;
    const sym = Math.abs(homeW - awayW);
    console.log("\n 80x80 (times iguais):");
    pass &= line("Simetria |home%-away%| (sem mando)", pctStr(sym), "< 2.0 pp", sym < 0.02);
    pass &= line("Empates", pctStr(draw), "22%–28%", within(draw, 0.22, 0.28));
    pass &= line("Gols por jogo", (G / N_QUICK).toFixed(2), "2.4–2.9", within(G / N_QUICK, 2.4, 2.9));
    pass &= line("Goleadas (7+ gols)", pctStr(big / N_QUICK), "< 3%", big / N_QUICK < 0.03);
  }

  // 1b) favorito forte e abismo: zebra rara
  for (const [oH, oA, lo, hi] of [[86, 78, 0.55, 0.80], [90, 70, 0.78, 0.95]]) {
    let hw = 0, dr = 0;
    for (let i = 0; i < N_QUICK; i++) {
      const r = simulateMatch({ squad: squad(oH) }, { squad: squad(oA) }, { knockout: false });
      if (r.winner === "home") hw++; else if (r.winner === "draw") dr++;
    }
    const favW = hw / N_QUICK;
    console.log(`\n ${oH}x${oA} (favorito):`);
    pass &= line("Vitória do favorito", pctStr(favW), `${pctStr(lo)}–${pctStr(hi)}`, within(favW, lo, hi));
  }
  return !!pass;
}

// ========== 2) MOTOR AO VIVO (2D) ==========
function runLive(oH, oA, tacH) {
  const eng = createLiveMatch(liveTeam(oH), liveTeam(oA), {
    knockout: false, homeColor: "#f00", awayColor: "#00f", cpu: { home: false, away: false },
  });
  eng.beginMatch(); // pula o ready-gate (sem UI no harness)
  if (tacH) eng.setTactic("home", tacH);
  const DIRS = ["cantoE", "meio", "cantoD"], rd = () => DIRS[Math.floor(Math.random() * 3)];
  let g = 0, lastPen = 0, pens = 0;
  while (!eng.isOver() && g < 30000) {
    if (eng.state.phase === "INT") { eng.setReady("home"); eng.setReady("away"); }
    const pp = eng.state.penaltyPending;
    if (pp && !pp.animating && pp.id !== lastPen) { // árbitro: resolve com escolhas aleatórias
      lastPen = pp.id; const aim = rd(), gk = rd(), matched = gk === aim, prob = pp.prob || 0.78;
      const raw = matched ? 0.16 + (prob - 0.6) * 0.6 : 0.86 + (prob - 0.6) * 0.25;
      eng.resolvePenalty(Math.random() < Math.max(matched ? 0.10 : 0.80, Math.min(matched ? 0.42 : 0.97, raw)), aim, gk);
      pens++;
    }
    eng.step(60, 6); g++;
  }
  const s = eng.state;
  s._pens = pens;
  const poss = s.stats.possession[0] + s.stats.possession[1] || 1;
  let cardPos = { GK: 0, DEF: 0, MID: 0, ATT: 0 }, cards = 0;
  for (const side of ["home", "away"]) for (const p of s.tokens[side]) {
    if (p.yellow > 0) { cardPos[p.pos] += (p.yellow >= 2 ? 2 : 1); cards += (p.yellow >= 2 ? 2 : 1); }
  }
  return {
    gh: s.score[0], ga: s.score[1],
    shots: s.stats.shots[0] + s.stats.shots[1], onT: s.stats.onTarget[0] + s.stats.onTarget[1],
    corners: s.stats.corners[0] + s.stats.corners[1], fouls: s.stats.fouls[0] + s.stats.fouls[1],
    reds: s.cards.home.filter((c) => c === "red").length + s.cards.away.filter((c) => c === "red").length,
    yellows: s.events.filter((e) => e.type === "yellow").length,
    pens: s._pens || 0,
    xg: s.xg[0] + s.xg[1],
    homePoss: s.stats.possession[0] / poss,
    badOT: (s.stats.onTarget[0] > s.stats.shots[0] || s.stats.onTarget[1] > s.stats.shots[1]) ? 1 : 0,
    badGoal: (s.score[0] > s.stats.shots[0] || s.score[1] > s.stats.shots[1]) ? 1 : 0,
    hw: s.score[0] > s.score[1], aw: s.score[1] > s.score[0],
    cardPos, cards,
  };
}
function calibLive() {
  console.log(`\n=== MOTOR AO VIVO (liveMatch.js) — ${N_LIVE} jogos ===`);
  let pass = true;
  let G = 0, SH = 0, OT = 0, CO = 0, F = 0, R = 0, Y = 0, P = 0, badOT = 0, badGoal = 0, HW = 0, AW = 0, XG = 0;
  let possSum = 0, possExtreme = 0;
  const cp = { GK: 0, DEF: 0, MID: 0, ATT: 0 }; let totCards = 0;
  for (let i = 0; i < N_LIVE; i++) {
    const r = runLive(80, 80);
    G += r.gh + r.ga; SH += r.shots; OT += r.onT; CO += r.corners; F += r.fouls;
    R += r.reds; Y += r.yellows; P += r.pens; badOT += r.badOT; badGoal += r.badGoal; XG += r.xg;
    if (r.hw) HW++; else if (r.aw) AW++;
    possSum += r.homePoss; if (r.homePoss < 0.25 || r.homePoss > 0.75) possExtreme++;
    for (const k in cp) cp[k] += r.cardPos[k]; totCards += r.cards;
  }
  const avgPoss = possSum / N_LIVE;
  const shotsT = SH / N_LIVE / 2, otT = OT / N_LIVE / 2, coT = CO / N_LIVE / 2, goalsT = G / N_LIVE / 2;
  const conv = goalsT / shotsT;
  const sym = Math.abs(HW - AW) / N_LIVE;
  console.log("\n 80x80 (times iguais):");
  pass &= line("Finalizações por time", shotsT.toFixed(1), "8–18", within(shotsT, 8, 18));
  pass &= line("Conversão (gols/chutes)", pctStr(conv), "9%–13%", within(conv, 0.09, 0.13));
  const xgT = XG / N_LIVE / 2;
  pass &= line("xG por time (≈ gols)", xgT.toFixed(2), `${(goalsT - 0.3).toFixed(2)}–${(goalsT + 0.6).toFixed(2)}`, within(xgT, goalsT - 0.3, goalsT + 0.6));
  pass &= line("No alvo por time", otT.toFixed(1), "3–7", within(otT, 3, 7));
  pass &= line("Escanteios por time", coT.toFixed(1), "3.5–7", within(coT, 3.5, 7));
  pass &= line("Faltas por time", (F / N_LIVE / 2).toFixed(1), "informativo", true);
  pass &= line("Vermelhos por jogo", (R / N_LIVE).toFixed(3), "~0.10 (0.06–0.16)", within(R / N_LIVE, 0.06, 0.16));
  pass &= line("Amarelos por jogo", (Y / N_LIVE).toFixed(2), "informativo", true);
  pass &= line("Pênaltis por jogo", (P / N_LIVE).toFixed(3), "~0.20 (0.13–0.28)", within(P / N_LIVE, 0.13, 0.28));
  pass &= line("Estados impossíveis (noAlvo>chutes)", badOT, "0", badOT === 0);
  pass &= line("Estados impossíveis (gol>chutes)", badGoal, "0", badGoal === 0);
  pass &= line("Simetria |home-away| (sem mando)", pctStr(sym), "< 4 pp", sym < 0.04);
  pass &= line("Posse média (simétrica, sem mando)", pctStr(avgPoss), "47%–53%", within(avgPoss, 0.47, 0.53));
  line("Jogos com posse extrema (<25%/>75%)", pctStr(possExtreme / N_LIVE), "informativo", true);
  const attPct = cp.ATT / (totCards || 1);
  pass &= line("Cartões p/ atacante (deve ser baixo)", pctStr(attPct), "< 15%", attPct < 0.15);
  return !!pass;
}

// ========== 3) TÁTICAS movem a probabilidade ==========
function calibTactics() {
  console.log("\n=== TÁTICAS movem o win% (λ + Skellam, times iguais 80x80) ===");
  const SL = SLOTS.map(([detail, pos], i) => ({ detail, pos, ovr: 80, stamina: 100, out: false, id: "t" + i }));
  const base = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4 };
  const st = (tH) => ({ tokens: { home: SL.map((p) => ({ ...p })), away: SL.map((p) => ({ ...p })) },
    tactics: { home: { ...base, ...tH }, away: { ...base } }, men: { home: 11, away: 11 }, score: [0, 0], minute: 0, form: { home: 1, away: 1 } });
  const win = (tH) => { const L = computeLambdas(st(tH)); return winProb(0, 0, L.home, L.away, 0, { knockout: true }).win; };
  const baseW = win({});
  const levers = [["Ofensivo", { posture: "ofensivo" }], ["Defensivo", { posture: "defensivo" }],
    ["Linha alta", { line: "alta" }], ["Linha baixa", { line: "baixa" }],
    ["Direto", { build: 1 }], ["Toque", { build: 0 }], ["Pressão alta", { marking: "pressao" }]];
  let moved = 0;
  for (const [name, t] of levers) {
    const w = win(t); const d = (w - baseW) * 100;
    const ok = Math.abs(d) > 0.05;
    if (ok) moved++;
    console.log(`  [${ok ? "OK" : "—"}] ${name.padEnd(14)} win=${pctStr(w)}  (Δ ${d >= 0 ? "+" : ""}${d.toFixed(1)}pp)`);
  }
  const pass = moved === levers.length;
  console.log(`  → ${moved}/${levers.length} táticas alteram o win%`);
  return pass;
}

// ========== run ==========
console.log("================ CALIBRAÇÃO DE REALISMO — FutDraft ================");
const a = calibQuick();
const b = calibLive();
const c = calibTactics();
console.log("\n================ RESULTADO ================");
console.log("Sim rápida :", a ? "PASS" : "FALHA");
console.log("Motor vivo :", b ? "PASS" : "FALHA");
console.log("Táticas    :", c ? "PASS" : "FALHA");
const ok = a && b && c;
console.log(ok ? "\n✓ Tudo dentro dos alvos de realismo." : "\n✗ Há desvios — ver linhas [FALHA] acima.");
process.exit(ok ? 0 : 1);
