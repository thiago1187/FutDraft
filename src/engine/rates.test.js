import { describe, it, expect } from "vitest";
import { computeLambdas, sectorStrength, effOvr } from "./rates.js";

const POS = [
  ["GOL", "GK"], ["LE", "DEF"], ["ZAG", "DEF"], ["ZAG", "DEF"], ["LD", "DEF"],
  ["VOL", "MID"], ["MC", "MID"], ["MEI", "MID"], ["PE", "ATT"], ["CA", "ATT"], ["PD", "ATT"],
];
function team(ovr, { attBoost = 0, defOvr = null } = {}) {
  return POS.map(([detail, pos]) => {
    let o = ovr;
    if (defOvr != null && pos === "DEF") o = defOvr;
    if (attBoost && pos === "ATT") o = ovr + attBoost;
    return { ovr: o, detail, pos, stamina: 100, out: false };
  });
}
const base = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4 };
function state(h, a, tH = {}, tA = {}) {
  return {
    tokens: { home: h, away: a },
    tactics: { home: { ...base, ...tH }, away: { ...base, ...tA } },
    men: { home: 11, away: 11 }, score: [0, 0], minute: 0, form: { home: 1, away: 1 },
  };
}

describe("computeLambdas (Dixon-Coles, campo neutro)", () => {
  it("é determinístico (sem Math.random)", () => {
    const s = state(team(80), team(80));
    const a = computeLambdas(s), b = computeLambdas(s);
    expect(a).toEqual(b);
  });

  it("times iguais → λ idênticos (SEM mando)", () => {
    const { home, away } = computeLambdas(state(team(80), team(80)));
    expect(Math.abs(home - away)).toBeLessThan(1e-9);
  });

  it("ataque mais forte → maior λ próprio", () => {
    const baseL = computeLambdas(state(team(80), team(80))).home;
    const boosted = computeLambdas(state(team(80, { attBoost: 12 }), team(80))).home;
    expect(boosted).toBeGreaterThan(baseL);
  });

  it("sinergia condicional: linha alta com zaga FRACA concede MAIS que com zaga forte", () => {
    const weak = computeLambdas(state(team(80, { defOvr: 64 }), team(80), { line: "alta" })).away;
    const strong = computeLambdas(state(team(80, { defOvr: 92 }), team(80), { line: "alta" })).away;
    expect(weak).toBeGreaterThan(strong);
  });

  it("ataque total aumenta o λ próprio E o do adversário", () => {
    const eq = computeLambdas(state(team(80), team(80)));
    const atk = computeLambdas(state(team(80), team(80), { posture: "ofensivo" }));
    expect(atk.home).toBeGreaterThan(eq.home);
    expect(atk.away).toBeGreaterThan(eq.away);
  });

  it("vermelho próprio derruba o próprio λ e sobe o do adversário", () => {
    const s = state(team(80), team(80));
    s.men.home = 10;
    const { home, away } = computeLambdas(s);
    const eq = computeLambdas(state(team(80), team(80)));
    expect(home).toBeLessThan(eq.home);
    expect(away).toBeGreaterThan(eq.away);
  });

  it("λ sempre dentro do clamp [0.12, 5], sem NaN", () => {
    const blow = computeLambdas(state(team(99, { attBoost: 0 }), team(50)));
    for (const v of [blow.home, blow.away]) {
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0.12);
      expect(v).toBeLessThanOrEqual(5);
    }
  });
});

describe("sectorStrength / effOvr", () => {
  it("effOvr cai com a fadiga, no máximo ~15%", () => {
    const fresh = effOvr({ ovr: 80, stamina: 100 });
    const tired = effOvr({ ovr: 80, stamina: 0 });
    expect(fresh).toBeCloseTo(80, 5);
    expect(tired).toBeCloseTo(68, 5); // 80 * 0.85
  });

  it("setor sem jogadores não quebra (fallback 70)", () => {
    expect(sectorStrength([], "attack")).toBe(70);
  });
});
