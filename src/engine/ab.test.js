import { describe, it, expect } from "vitest";
import { lambdas, winPct, liveAB, tokens } from "./ab.js";

// Regressão permanente da auditoria A/B (Prompt 2): cada alavanca/atributo move a
// métrica certa na DIREÇÃO certa. λ-based = exato; células ao vivo = estatístico (N
// moderado, efeitos grandes). Trava também as duas correções achadas na auditoria:
// (1) sem inversão de win% mentalidade, (2) over de meio move a posse (não é botão morto).
describe("A/B funcionalidade — táticas e over (regressão)", () => {
  const home = tokens(80), away = tokens(80);

  it("Mentalidade: ataque sobe gols feitos E sofridos; retranca abaixa ambos", () => {
    const atk = lambdas(home, away, { posture: "ofensivo" });
    const def = lambdas(home, away, { posture: "defensivo" });
    const eq = lambdas(home, away);
    expect(atk.home).toBeGreaterThan(eq.home);
    expect(atk.away).toBeGreaterThan(eq.away);
    expect(def.home).toBeLessThan(eq.home);
    expect(def.away).toBeLessThan(eq.away);
  });

  it("Mentalidade SEM inversão: ataque não ganha menos win% que retranca", () => {
    expect(winPct(home, away, { posture: "ofensivo" })).toBeGreaterThanOrEqual(winPct(home, away, { posture: "defensivo" }));
  });

  it("Linha alta concede mais xG que linha baixa", () => {
    expect(lambdas(home, away, { line: "alta" }).away).toBeGreaterThan(lambdas(home, away, { line: "baixa" }).away);
  });

  it("Sinergia condicional: linha alta com zaga FRACA concede Δ maior que com zaga forte", () => {
    const strong = tokens(80, { defOvr: 90 }), weak = tokens(80, { defOvr: 64 });
    const dS = lambdas(strong, away, { line: "alta" }).away - lambdas(strong, away, { line: "media" }).away;
    const dW = lambdas(weak, away, { line: "alta" }).away - lambdas(weak, away, { line: "media" }).away;
    expect(dW).toBeGreaterThan(dS);
  });

  it("Over por setor: +ataque ↑xG criado; +defesa e +goleiro ↓xG sofrido", () => {
    const base = lambdas(home, away);
    expect(lambdas(tokens(80, { ATT: 8 }), away).home).toBeGreaterThan(base.home);
    expect(lambdas(tokens(80, { DEF: 8 }), away).away).toBeLessThan(base.away);
    expect(lambdas(tokens(80, { GK: 8 }), away).away).toBeLessThan(base.away);
  });

  it("win% sobe monotonicamente com o over (+0 < +5 < +10), sem virar 100%", () => {
    const w0 = winPct(tokens(80), away), w5 = winPct(tokens(85), away), w10 = winPct(tokens(95), away);
    expect(w5).toBeGreaterThan(w0);
    expect(w10).toBeGreaterThan(w5);
    expect(w10).toBeLessThan(1);
  });

  // ----- células ao vivo (estatístico; N moderado pois os efeitos são grandes) -----
  it("Pressing alto gera MAIS faltas que marcação leve", () => {
    const leve = liveAB({ marking: "leve" }, 160);
    const press = liveAB({ marking: "pressao" }, 160);
    expect(press.fouls).toBeGreaterThan(leve.fouls + 2);
  }, 30000);

  it("Jogo direto faz MENOS passes que toque", () => {
    const toque = liveAB({ build: 0.1 }, 160);
    const direto = liveAB({ build: 0.9 }, 160);
    expect(direto.passAtt).toBeLessThan(toque.passAtt - 1);
  }, 30000);

  it("Meio mais forte (over) AUMENTA a posse (não é botão morto)", () => {
    // boost grande no meio + N alto → margem ~5σ (efeito ~+0.018), robusto p/ CI.
    const m = liveAB(null, 700, { MID: 14 });
    expect(m.poss).toBeGreaterThan(0.505);
  }, 40000);
});
