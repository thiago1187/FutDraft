import { describe, it, expect } from "vitest";
import { mulberry32, gaussian } from "./rng.js";

describe("mulberry32 (PRNG semeável)", () => {
  it("mesma seed → mesma sequência", () => {
    const a = mulberry32(12345), b = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("seeds diferentes → sequências diferentes", () => {
    const a = mulberry32(1), b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it("saída sempre em [0,1)", () => {
    const r = mulberry32(99);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("gaussian é determinístico pela seed e ~média 0", () => {
    const r1 = mulberry32(7), r2 = mulberry32(7);
    expect(gaussian(r1)).toBe(gaussian(r2));
    const r = mulberry32(42);
    let sum = 0; const N = 5000;
    for (let i = 0; i < N; i++) sum += gaussian(r);
    expect(Math.abs(sum / N)).toBeLessThan(0.1);
  });
});
