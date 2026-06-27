import { describe, it, expect } from "vitest";
import { createLiveMatch, penaltyScored } from "./liveMatch.js";
import { mulberry32 } from "./rng.js";
import { findFormation } from "./formations.js";

const POS = [
  ["GOL", "GK"], ["LE", "DEF"], ["ZAG", "DEF"], ["ZAG", "DEF"], ["LD", "DEF"],
  ["VOL", "MID"], ["MC", "MID"], ["MEI", "MID"], ["PE", "ATT"], ["CA", "ATT"], ["PD", "ATT"],
];
let uid = 0;
function team(ovr) {
  return { name: "T", bench: [], lineup: { formation: findFormation(11, "4-3-3") },
    squad: POS.map(([detail, pos]) => ({ id: "p" + uid++, name: detail, pos, detail, ovr, flag: "" })) };
}

// Roda uma partida ao vivo até o fim (bot×bot), resolvendo pênaltis com escolhas FIXAS,
// para isolar o determinismo do motor pela seed.
function runLive(seed) {
  const eng = createLiveMatch(team(80), team(80), {
    knockout: false, seed, cpu: { home: true, away: true },
  });
  eng.beginMatch();
  let g = 0, lastPen = 0;
  while (!eng.isOver() && g < 40000) {
    if (eng.state.phase === "INT") { eng.setReady("home"); eng.setReady("away"); }
    const pp = eng.state.penaltyPending;
    if (pp && !pp.animating && pp.id !== lastPen) { lastPen = pp.id; eng.resolvePenalty(true, "meio", "cantoE"); }
    eng.step(60, 6); g++;
  }
  const s = eng.state;
  return {
    seed: s.seed, score: [...s.score], shots: [...s.stats.shots],
    onTarget: [...s.stats.onTarget], xg: s.xg.map((v) => Math.round(v * 1000)),
    possession: [...s.stats.possession],
  };
}

describe("createLiveMatch — determinismo pela seed", () => {
  it("guarda a seed no estado", () => {
    const eng = createLiveMatch(team(80), team(80), { seed: 777 });
    expect(eng.state.seed).toBe(777);
  });

  it("mesma seed (+ mesmas entradas) → partida idêntica", () => {
    for (const seed of [3, 808, 123456]) {
      expect(runLive(seed)).toEqual(runLive(seed));
    }
  });

  it("seeds diferentes → partidas diferentes", () => {
    const a = runLive(11), b = runLive(22);
    // pelo menos uma métrica difere (placar, chutes ou posse)
    const differ = JSON.stringify([a.score, a.shots, a.possession]) !== JSON.stringify([b.score, b.shots, b.possession]);
    expect(differ).toBe(true);
  });
});

describe("reidratação (T7) — serialize/restore continua a partida", () => {
  function resolveIfPen(e) {
    if (e.state.penaltyPending && !e.state.penaltyPending.animating) e.resolvePenalty(true, "meio", "cantoE");
    if (e.state.phase === "INT") { e.setReady("home"); e.setReady("away"); }
  }

  it("restore a partir do meio reproduz EXATAMENTE o resto da partida", () => {
    const home = team(80), away = team(80); // mesmos elencos nos dois motores
    const orig = createLiveMatch(home, away, { seed: 4242, cpu: { home: true, away: true } });
    orig.beginMatch();
    // roda até ~45' e tira o snapshot no meio
    let g = 0;
    while (orig.state.minute < 45 && !orig.isOver() && g < 20000) { resolveIfPen(orig); orig.step(60, 6); g++; }
    const snap = orig.serialize();
    expect(snap.state.minute).toBeGreaterThanOrEqual(40);

    // novo motor reidratado do snapshot (como faria o novo anfitrião)
    const rehy = createLiveMatch(home, away, { restore: snap });
    expect(rehy.state.score).toEqual(orig.state.score);
    expect(rehy.state.minute).toBe(orig.state.minute);

    // segue os dois em lockstep até o fim → resultado idêntico (mesma seed + estado)
    while (!orig.isOver() && g < 40000) { resolveIfPen(orig); resolveIfPen(rehy); orig.step(60, 6); rehy.step(60, 6); g++; }
    expect(rehy.state.score).toEqual(orig.state.score);
    expect(rehy.state.stats.shots).toEqual(orig.state.stats.shots);
    expect(rehy.state.cards).toEqual(orig.state.cards);
    expect(rehy.result().homeGoals).toBe(orig.result().homeGoals);
    expect(rehy.result().awayGoals).toBe(orig.result().awayGoals);
  });

  it("serialize captura seed e contador do PRNG", () => {
    const e = createLiveMatch(team(80), team(80), { seed: 99, cpu: { home: true, away: true } });
    e.beginMatch();
    for (let i = 0; i < 200; i++) e.step(60, 6);
    const s = e.serialize();
    expect(s.seed).toBe(99);
    expect(typeof s.rngState).toBe("number");
    expect(s.state.minute).toBe(e.state.minute);
  });
});

describe("penaltyScored — conversão ~67%", () => {
  const DIRS = ["cantoE", "meio", "cantoD"];
  it("com escolhas aleatórias (goleiro acerta ~1/3) converte ~67%", () => {
    const r = mulberry32(2024);
    let goals = 0; const N = 30000;
    for (let i = 0; i < N; i++) {
      const aim = DIRS[Math.floor(r() * 3)], gk = DIRS[Math.floor(r() * 3)];
      if (penaltyScored(0.78, aim, gk, r)) goals++;
    }
    const conv = goals / N;
    expect(conv).toBeGreaterThan(0.60);
    expect(conv).toBeLessThan(0.73);
  });
  it("goleiro no canto certo defende mais do que no canto errado", () => {
    const r = mulberry32(7);
    let matched = 0, unmatched = 0; const N = 8000;
    for (let i = 0; i < N; i++) {
      if (penaltyScored(0.78, "cantoE", "cantoE", r)) matched++;
      if (penaltyScored(0.78, "cantoE", "cantoD", r)) unmatched++;
    }
    expect(unmatched / N).toBeGreaterThan(matched / N);
  });
});
