import { describe, it, expect } from "vitest";
import { simulateMatch } from "./match.js";

// Elenco sintético por overall (mesma forma do harness de calibração).
const POS = [
  ["GOL", "GK"], ["LE", "DEF"], ["ZAG", "DEF"], ["ZAG", "DEF"], ["LD", "DEF"],
  ["VOL", "MID"], ["MC", "MID"], ["MEI", "MID"], ["PE", "ATT"], ["CA", "ATT"], ["PD", "ATT"],
];
let uid = 0;
function squad(ovr) {
  return { squad: POS.map(([detail, pos]) => ({ id: "p" + uid++, name: detail, pos, detail, ovr, flag: "" })) };
}

// Testes ESTATÍSTICOS: travam as faixas de realismo do motor de sim rápida (match.js)
// como rede de regressão ANTES de qualquer refactor. Bandas folgadas p/ não dar flaky.
describe("simulateMatch — realismo (regressão)", () => {
  const N = 4000;

  it("times iguais (80x80): gols ~2,5, empates ~25%, SEM mando", () => {
    let G = 0, hw = 0, aw = 0, dr = 0, big = 0;
    for (let i = 0; i < N; i++) {
      const r = simulateMatch(squad(80), squad(80), { knockout: false });
      G += r.homeGoals + r.awayGoals;
      if (r.homeGoals + r.awayGoals >= 7) big++;
      if (r.winner === "home") hw++; else if (r.winner === "away") aw++; else dr++;
    }
    const goals = G / N, draws = dr / N, sym = Math.abs(hw - aw) / N;
    expect(goals).toBeGreaterThan(2.2);
    expect(goals).toBeLessThan(2.95);
    expect(draws).toBeGreaterThan(0.20);
    expect(draws).toBeLessThan(0.32);
    expect(sym).toBeLessThan(0.04); // sem vantagem de casa
    expect(big / N).toBeLessThan(0.03); // sem epidemia de goleadas
  });

  it("favorito forte (90x70) vence na grande maioria, mas não sempre (zebra existe)", () => {
    let favW = 0;
    for (let i = 0; i < N; i++) {
      const r = simulateMatch(squad(90), squad(70), { knockout: false });
      if (r.winner === "home") favW++;
    }
    const p = favW / N;
    expect(p).toBeGreaterThan(0.72);
    expect(p).toBeLessThan(0.98);
  });

  it("determinismo: mesma seed → partida idêntica (replay)", () => {
    const A = squad(83), B = squad(79); // MESMOS elencos nos dois runs (mesmos inputs)
    for (const seed of [1, 42, 99999, 2 ** 31]) {
      const a = simulateMatch(A, B, { knockout: true, seed });
      const b = simulateMatch(A, B, { knockout: true, seed });
      expect(a.homeGoals).toBe(b.homeGoals);
      expect(a.awayGoals).toBe(b.awayGoals);
      expect(a.winner).toBe(b.winner);
      expect(JSON.stringify(a.events)).toBe(JSON.stringify(b.events));
      expect(JSON.stringify(a.pens)).toBe(JSON.stringify(b.pens));
    }
  });

  it("seeds diferentes → resultados variam (não trava num placar)", () => {
    const results = new Set();
    for (let s = 0; s < 40; s++) {
      const r = simulateMatch(squad(80), squad(80), { knockout: false, seed: s });
      results.add(r.homeGoals + "x" + r.awayGoals);
    }
    expect(results.size).toBeGreaterThan(5);
  });

  it("coerência: nunca mais gols que finalizações implícitas; placar = soma dos eventos de gol", () => {
    for (let i = 0; i < 500; i++) {
      const r = simulateMatch(squad(80), squad(82), { knockout: true });
      const goalEvents = r.events.filter((e) => e.type === "goal").length;
      expect(goalEvents).toBe(r.homeGoals + r.awayGoals);
      // mata-mata nunca termina empatado (vai a pênaltis)
      expect(r.winner === "home" || r.winner === "away").toBe(true);
    }
  });
});
