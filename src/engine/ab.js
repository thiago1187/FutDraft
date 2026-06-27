// Medição A/B de funcionalidade (Prompt 2): prova por medição que cada alavanca tática
// e cada atributo movem a métrica certa, na direção certa. Usado pelo harness
// (`sim:calibrate --ab`) e travado como regressão em ab.test.js.
//
// λ-based (computeLambdas/winProb) = exato, sem ruído → prova a direção sem amostragem.
// live (createLiveMatch) = mede o que só o motor ao vivo produz (faltas, passes, posse).

import { computeLambdas } from "./rates.js";
import { winProb } from "./winprob.js";
import { createLiveMatch, penaltyScored } from "./liveMatch.js";
import { findFormation } from "./formations.js";

const SLOTS = [
  ["GOL", "GK"], ["LE", "DEF"], ["ZAG", "DEF"], ["ZAG", "DEF"], ["LD", "DEF"],
  ["VOL", "MID"], ["MC", "MID"], ["MEI", "MID"], ["PE", "ATT"], ["CA", "ATT"], ["PD", "ATT"],
];
export const NEUTRAL = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4 };

// 11 tokens num dado over, com boost por setor (ATT/DEF/MID/GK) ou defOvr fixo.
export function tokens(ovr, boost = {}) {
  return SLOTS.map(([detail, pos], i) => {
    let o = ovr;
    if (pos === "ATT" && boost.ATT) o += boost.ATT;
    if (pos === "DEF" && boost.DEF) o += boost.DEF;
    if (pos === "GK" && boost.GK) o += boost.GK;
    if (pos === "MID" && boost.MID) o += boost.MID;
    if (pos === "DEF" && boost.defOvr != null) o = boost.defOvr;
    return { id: "t" + i, detail, pos, ovr: Math.max(40, Math.min(99, o)), stamina: 100, out: false };
  });
}

export function lambdas(homeTok, awayTok, tH = {}, tA = {}) {
  return computeLambdas({
    tokens: { home: homeTok, away: awayTok },
    tactics: { home: { ...NEUTRAL, ...tH }, away: { ...NEUTRAL, ...tA } },
    men: { home: 11, away: 11 }, score: [0, 0], minute: 0, form: { home: 1, away: 1 },
  });
}
// win% (campo neutro, mata-mata divide empate) — exato via Skellam.
export function winPct(homeTok, awayTok, tH = {}, tA = {}) {
  const L = lambdas(homeTok, awayTok, tH, tA);
  return winProb(0, 0, L.home, L.away, 0, { knockout: true }).win;
}

function liveTeam(ovr, boost) {
  const sq = tokens(ovr, boost).map((t, i) => ({ ...t, name: t.detail, id: "p" + i + "_" + ((Math.random() * 1e9) | 0).toString(36), flag: "" }));
  return { name: "T", bench: [], lineup: { formation: findFormation(11, "4-3-3") }, squad: sq };
}

// Roda N partidas ao vivo (bot×bot) com a tática tH no MANDANTE (away neutro) e devolve
// as médias das métricas do mandante. homeBoost = boost de over por setor no mandante.
export function liveAB(tH, N, homeBoost) {
  const acc = { fouls: 0, cards: 0, passAtt: 0, passOk: 0, poss: 0, gf: 0, ga: 0, shots: 0 };
  let foulsSq = 0;
  for (let i = 0; i < N; i++) {
    const eng = createLiveMatch(liveTeam(80, homeBoost), liveTeam(80), {
      knockout: false, seed: (Math.random() * 4294967296) >>> 0, cpu: { home: true, away: true },
    });
    eng.beginMatch();
    if (tH) eng.setTactic("home", tH);
    let g = 0, lastPen = 0;
    while (!eng.isOver() && g < 30000) {
      if (eng.state.phase === "INT") { eng.setReady("home"); eng.setReady("away"); }
      const pp = eng.state.penaltyPending;
      if (pp && !pp.animating && pp.id !== lastPen) { lastPen = pp.id; eng.resolvePenalty(penaltyScored(pp.prob || 0.78, "meio", "cantoE", Math.random), "meio", "cantoE"); }
      eng.step(60, 6); g++;
    }
    const s = eng.state;
    const f = s.stats.fouls[0]; acc.fouls += f; foulsSq += f * f;
    acc.cards += s.tokens.home.reduce((n, p) => n + (p.yellow || 0), 0) + s.cards.home.filter((c) => c === "red").length;
    acc.passAtt += s.stats.passAtt[0]; acc.passOk += s.stats.passOk[0];
    const tp = s.stats.possession[0] + s.stats.possession[1] || 1; acc.poss += s.stats.possession[0] / tp;
    acc.gf += s.score[0]; acc.ga += s.score[1]; acc.shots += s.stats.shots[0];
  }
  const m = {};
  for (const k in acc) m[k] = acc[k] / N;
  m.passPct = acc.passOk / (acc.passAtt || 1);
  m.foulsSE = Math.sqrt(Math.max(0, foulsSq / N - m.fouls * m.fouls) / N);
  return m;
}
