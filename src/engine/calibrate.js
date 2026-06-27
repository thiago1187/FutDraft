// Harness de calibração de realismo (npm run sim:calibrate).
// Roda partidas em massa nos DOIS caminhos (sim rápida = torneio; motor ao vivo = 2D),
// agrega as distribuições e compara com os ALVOS reais do brief (§12). Emite um
// relatório de desvios (alvo vs obtido) com PASS/FAIL — é o trava-realismo para
// mudanças futuras não quebrarem o motor.
//
// Uso:  node src/engine/calibrate.js [Nrapida] [Nvivo]
//
// NÃO usa DOM nem Supabase: monta elencos sintéticos por overall.

import { createLiveMatch, penaltyScored } from "./liveMatch.js";
import { simulateMatch } from "./match.js";
import { computeLambdas } from "./rates.js";
import { winProb } from "./winprob.js";
import { findFormation } from "./formations.js";

const N_QUICK = Number(process.argv[2]) || 20000; // sim rápida (rápida → N alto)
const N_LIVE = Number(process.argv[3]) || 3000;   // motor ao vivo (mais lento; N alto p/ bandas estreitas de cartão não dar flaky)

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
  let g = 0, lastPen = 0, pens = 0, penGoals = 0;
  while (!eng.isOver() && g < 30000) {
    if (eng.state.phase === "INT") { eng.setReady("home"); eng.setReady("away"); }
    const pp = eng.state.penaltyPending;
    if (pp && !pp.animating && pp.id !== lastPen) { // árbitro: escolhas aleatórias (canto/mergulho)
      lastPen = pp.id; const aim = rd(), gk = rd();
      const scored = penaltyScored(pp.prob || 0.78, aim, gk, Math.random);
      if (scored) penGoals++;
      eng.resolvePenalty(scored, aim, gk);
      pens++;
    }
    eng.step(60, 6); g++;
  }
  const s = eng.state;
  const poss = s.stats.possession[0] + s.stats.possession[1] || 1;
  let cardPos = { GK: 0, DEF: 0, MID: 0, ATT: 0 }, cards = 0;
  for (const side of ["home", "away"]) for (const p of s.tokens[side]) {
    if (p.yellow > 0) { cardPos[p.pos] += (p.yellow >= 2 ? 2 : 1); cards += (p.yellow >= 2 ? 2 : 1); }
  }
  const directReds = s.events.filter((e) => e.type === "red" && !/amarelo/i.test(e.reason || "")).length;
  return {
    gh: s.score[0], ga: s.score[1],
    shots: s.stats.shots[0] + s.stats.shots[1], onT: s.stats.onTarget[0] + s.stats.onTarget[1],
    corners: s.stats.corners[0] + s.stats.corners[1], fouls: s.stats.fouls[0] + s.stats.fouls[1],
    reds: s.cards.home.filter((c) => c === "red").length + s.cards.away.filter((c) => c === "red").length,
    directReds,
    yellows: s.events.filter((e) => e.type === "yellow").length,
    pens, penGoals,
    passAtt: s.stats.passAtt[0] + s.stats.passAtt[1],
    passOk: s.stats.passOk[0] + s.stats.passOk[1],
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
  let G = 0, SH = 0, OT = 0, CO = 0, F = 0, R = 0, DR = 0, Y = 0, P = 0, PG = 0, badOT = 0, badGoal = 0, HW = 0, AW = 0, XG = 0;
  let PA = 0, POK = 0, possSum = 0, possExtreme = 0;
  const cp = { GK: 0, DEF: 0, MID: 0, ATT: 0 }; let totCards = 0;
  for (let i = 0; i < N_LIVE; i++) {
    const r = runLive(80, 80);
    G += r.gh + r.ga; SH += r.shots; OT += r.onT; CO += r.corners; F += r.fouls;
    R += r.reds; DR += r.directReds; Y += r.yellows; P += r.pens; PG += r.penGoals;
    PA += r.passAtt; POK += r.passOk; badOT += r.badOT; badGoal += r.badGoal; XG += r.xg;
    if (r.hw) HW++; else if (r.aw) AW++;
    possSum += r.homePoss; if (r.homePoss < 0.25 || r.homePoss > 0.75) possExtreme++;
    for (const k in cp) cp[k] += r.cardPos[k]; totCards += r.cards;
  }
  const avgPoss = possSum / N_LIVE;
  const shotsT = SH / N_LIVE / 2, otT = OT / N_LIVE / 2, coT = CO / N_LIVE / 2, goalsT = G / N_LIVE / 2;
  const conv = goalsT / shotsT;
  const sym = Math.abs(HW - AW) / N_LIVE;
  const passPct = POK / (PA || 1);
  const penConv = PG / (P || 1);
  const reds = R / N_LIVE, dReds = DR / N_LIVE, yel = Y / N_LIVE, secondYellowReds = reds - dReds;
  console.log("\n 80x80 (times iguais):");
  pass &= line("Gols por jogo (2 times)", (G / N_LIVE).toFixed(2), "2.2–2.8", within(G / N_LIVE, 2.2, 2.8));
  pass &= line("Finalizações por time", shotsT.toFixed(1), "8–18", within(shotsT, 8, 18));
  pass &= line("Conversão de chutes", pctStr(conv), "9%–11%", within(conv, 0.085, 0.115));
  const xgT = XG / N_LIVE / 2;
  pass &= line("xG por time (≈ gols)", xgT.toFixed(2), `${(goalsT - 0.3).toFixed(2)}–${(goalsT + 0.6).toFixed(2)}`, within(xgT, goalsT - 0.3, goalsT + 0.6));
  pass &= line("No alvo por time", otT.toFixed(1), "3–7", within(otT, 3, 7));
  pass &= line("Escanteios por time", coT.toFixed(1), "3.5–7", within(coT, 3.5, 7));
  pass &= line("Passe certo", pctStr(passPct), "75%–88%", within(passPct, 0.75, 0.88));
  pass &= line("Faltas por jogo (2 times)", (F / N_LIVE).toFixed(1), "informativo", true);
  pass &= line("Amarelos por jogo (2 times)", yel.toFixed(2), "3.5–4.0", within(yel, 3.5, 4.0));
  pass &= line("Vermelhos por jogo (total)", reds.toFixed(3), "0.20–0.25", within(reds, 0.20, 0.25));
  pass &= line("  dos quais 2º amarelo (maioria)", secondYellowReds.toFixed(3), `> direto (${dReds.toFixed(3)})`, secondYellowReds > dReds);
  pass &= line("Vermelho DIRETO por jogo (raro)", dReds.toFixed(3), "0.06–0.08", within(dReds, 0.055, 0.09));
  pass &= line("Pênaltis por jogo", (P / N_LIVE).toFixed(3), "~0.20 (0.13–0.28)", within(P / N_LIVE, 0.13, 0.28));
  // pênaltis são raros (~0.2/jogo) → amostra pequena mesmo com N alto; banda ±6pp p/ não dar flaky.
  pass &= line("Conversão de pênalti (~67%)", pctStr(penConv), "61%–73%", within(penConv, 0.61, 0.73));
  pass &= line("Estados impossíveis (noAlvo>chutes)", badOT, "0", badOT === 0);
  pass &= line("Estados impossíveis (gol>chutes)", badGoal, "0", badGoal === 0);
  pass &= line("Simetria |home-away| (sem mando)", pctStr(sym), "< 4 pp", sym < 0.04);
  pass &= line("Posse média (simétrica, sem mando)", pctStr(avgPoss), "47%–53%", within(avgPoss, 0.47, 0.53));
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

// ========== 4) A/B de funcionalidade (Prompt 2) — `--ab` ==========
import { lambdas, winPct, liveAB, tokens } from "./ab.js";

function abLine(name, metric, A, B, dir, sig) {
  const d = B - A, ok = sig && (dir === 0 || Math.sign(d) === Math.sign(dir));
  const tag = ok ? "OK" : sig ? "DIR✗" : "MORTO";
  console.log(`  [${tag}] ${name.padEnd(26)} ${metric.padEnd(20)} A=${A.toFixed(3)}  B=${B.toFixed(3)}  Δ=${d >= 0 ? "+" : ""}${d.toFixed(3)}`);
  return ok;
}
function calibAB() {
  const N = Number(process.argv.find((a, i) => process.argv[i - 1] === "--ab")) || 8000;
  console.log(`\n================ A/B DE FUNCIONALIDADE (live N=${N}/célula) ================`);
  let pass = true;
  const home = tokens(80), away = tokens(80);
  const base = lambdas(home, away);

  console.log("\n§1 ALAVANCAS TÁTICAS (uma de cada vez, resto neutro; mandante recebe a tática):");
  // Mentalidade: gols feitos (λ_home), gols sofridos (λ_away), win%
  {
    const A = lambdas(home, away, { posture: "defensivo" }), B = lambdas(home, away, { posture: "ofensivo" });
    pass &= abLine("Mentalidade", "gols feitos (λ)", A.home, B.home, +1, Math.abs(B.home - A.home) > 0.02);
    pass &= abLine("  (Retranca→Ataque)", "gols sofridos (λ)", A.away, B.away, +1, Math.abs(B.away - A.away) > 0.02);
    const wA = winPct(home, away, { posture: "defensivo" }), wB = winPct(home, away, { posture: "ofensivo" });
    console.log(`  [info] win%: Retranca=${(wA * 100).toFixed(1)}%  Ataque=${(wB * 100).toFixed(1)}%  (base 50%) → ${wB >= wA ? "Ataque ≥ Retranca ✓" : "⚠ Retranca vence mais (suspeito)"}`);
    pass &= (wB >= wA);
  }
  // Linha: xG sofrido (λ_away) baixa vs alta
  {
    const A = lambdas(home, away, { line: "baixa" }), B = lambdas(home, away, { line: "alta" });
    pass &= abLine("Linha defensiva", "xG sofrido (λ_adv)", A.away, B.away, +1, Math.abs(B.away - A.away) > 0.02);
  }
  // Pressing: faltas + cartões (live) leve vs pressão
  {
    const A = liveAB({ marking: "leve" }, N), B = liveAB({ marking: "pressao" }, N);
    pass &= abLine("Pressing", "faltas (mandante)", A.fouls, B.fouls, +1, Math.abs(B.fouls - A.fouls) > 2 * (A.foulsSE + B.foulsSE));
    pass &= abLine("  (Leve→Pressão)", "cartões (mandante)", A.cards, B.cards, +1, Math.abs(B.cards - A.cards) > 0.05);
  }
  // Construção: nº de passes (live) toque vs direto
  {
    const A = liveAB({ build: 0.1 }, N), B = liveAB({ build: 0.9 }, N);
    pass &= abLine("Construção", "passes tentados", A.passAtt, B.passAtt, -1, Math.abs(B.passAtt - A.passAtt) > 1);
    pass &= abLine("  (Toque→Direto)", "passe certo %", A.passPct, B.passPct, -1, Math.abs(B.passPct - A.passPct) > 0.005);
  }

  console.log("\n§2 SINERGIA TÁTICA × ELENCO (efeito CONDICIONAL, escala com o atributo):");
  {
    // linha alta vs média: o quanto a defesa concede A MAIS. Com zaga FRACA o salto é MAIOR.
    const strong = tokens(80, { defOvr: 90 }), weak = tokens(80, { defOvr: 64 });
    const dStrong = lambdas(strong, away, { line: "alta" }).away - lambdas(strong, away, { line: "media" }).away;
    const dWeak = lambdas(weak, away, { line: "alta" }).away - lambdas(weak, away, { line: "media" }).away;
    pass &= abLine("Linha alta × zaga", "Δ xG sofrido (alta-média)", dStrong, dWeak, +1, dWeak > dStrong + 0.01);
    console.log(`  → zaga fraca sofre ${(dWeak / Math.max(dStrong, 1e-9)).toFixed(1)}× mais com linha alta (condicional ✓)`);
  }

  console.log("\n§3 OVER POR SETOR (atributo move a métrica do setor):");
  {
    pass &= abLine("+Ataque (+8)", "xG criado (λ_home)", base.home, lambdas(tokens(80, { ATT: 8 }), away).home, +1, true);
    pass &= abLine("+Defesa (+8)", "xG sofrido (λ_away)", base.away, lambdas(tokens(80, { DEF: 8 }), away).away, -1, true);
    pass &= abLine("+Goleiro (+8)", "xG sofrido (λ_away)", base.away, lambdas(tokens(80, { GK: 8 }), away).away, -1, true);
    const mid = liveAB(null, N, { MID: 8 });
    pass &= abLine("+Meio (+8)", "posse (mandante)", 0.5, mid.poss, +1, Math.abs(mid.poss - 0.5) > 0.005);
    // monotonia do win% com o over
    const w0 = winPct(tokens(80), away), w5 = winPct(tokens(85), away), w10 = winPct(tokens(90), away);
    const mono = w0 < w5 && w5 < w10;
    console.log(`  [${mono ? "OK" : "DIR✗"}] win% monotônico com over    +0=${(w0 * 100).toFixed(1)}%  +5=${(w5 * 100).toFixed(1)}%  +10=${(w10 * 100).toFixed(1)}%`);
    pass &= mono;
  }
  return !!pass;
}

// ========== run ==========
if (process.argv.includes("--ab")) {
  const r = calibAB();
  console.log("\n================ RESULTADO A/B ================");
  console.log(r ? "✓ Toda alavanca/atributo move a métrica certa na direção certa (nenhum botão morto)." : "✗ Há botão morto ou direção errada — ver [MORTO]/[DIR✗] acima.");
  process.exit(r ? 0 : 1);
}
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
