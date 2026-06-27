import { describe, it, expect } from "vitest";
import { winProb } from "./winprob.js";

describe("winProb (Skellam)", () => {
  it("probabilidades somam 1 em toda a grade (não-mata-mata)", () => {
    for (const lamA of [0.2, 0.8, 1.5, 2.5, 4]) {
      for (const lamB of [0.2, 0.8, 1.5, 2.5, 4]) {
        for (const minute of [0, 30, 45, 89]) {
          const { win, draw, loss } = winProb(0, 0, lamA, lamB, minute, {});
          expect(Math.abs(win + draw + loss - 1)).toBeLessThan(1e-9);
          expect(win).toBeGreaterThanOrEqual(0);
          expect(draw).toBeGreaterThanOrEqual(0);
          expect(loss).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("no mata-mata o empate é dividido (draw = 0, win+loss = 1)", () => {
    const { win, draw, loss } = winProb(0, 0, 1.4, 1.4, 0, { knockout: true });
    expect(draw).toBe(0);
    expect(Math.abs(win + loss - 1)).toBeLessThan(1e-9);
  });

  it("maior λ → maior chance de vitória", () => {
    const strong = winProb(0, 0, 2.2, 1.0, 0, {}).win;
    const weak = winProb(0, 0, 1.0, 2.2, 0, {}).win;
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeGreaterThan(0.5);
  });

  it("λ simétrico → win ≈ loss (sem viés/mando)", () => {
    const { win, loss } = winProb(0, 0, 1.6, 1.6, 0, {});
    expect(Math.abs(win - loss)).toBeLessThan(1e-9);
  });

  it("estar à frente aumenta a chance de vitória", () => {
    const leading = winProb(1, 0, 1.4, 1.4, 60, {}).win;
    const level = winProb(0, 0, 1.4, 1.4, 60, {}).win;
    expect(leading).toBeGreaterThan(level);
  });
});
