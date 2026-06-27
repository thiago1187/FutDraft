import { describe, it, expect } from "vitest";
import { lambdas, winPct, liveAB, tokens, pWin, simWinFreq } from "./ab.js";
import { winProb } from "./winprob.js";

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

describe("Alavanca 1 — Foco de ataque / lado preferido", () => {
  const away = tokens(80);

  it("escolher um lado concentra o xG naquele corredor", () => {
    const neu = liveAB({ attackSide: "meio" }, 200);
    const dir = liveAB({ attackSide: "dir" }, 200);
    const esq = liveAB({ attackSide: "esq" }, 200);
    expect(dir.xgShareDir).toBeGreaterThan(neu.xgShareDir + 0.06);
    expect(esq.xgShareEsq).toBeGreaterThan(neu.xgShareEsq + 0.06);
  }, 40000);

  it("matchup condicional: atacar o flanco DEFENSIVO fraco do rival rende mais xG (λ)", () => {
    const home = tokens(80);
    const weakLeft = tokens(80, { set: { LE: 60, PE: 62 } });   // adversário fraco na esquerda
    const strongLeft = tokens(80, { set: { LE: 92, PE: 90 } });  // adversário forte na esquerda
    const lamWeak = lambdas(home, weakLeft, { attackSide: "dir" }).home;   // direita minha = esquerda dele
    const lamStrong = lambdas(home, strongLeft, { attackSide: "dir" }).home;
    expect(lamWeak).toBeGreaterThan(lamStrong + 0.05);
  });

  it("foco 'meio' não muda o λ de times equilibrados (sem regressão)", () => {
    const home = tokens(80);
    expect(lambdas(home, away, { attackSide: "meio" }).home).toBeCloseTo(lambdas(home, away).home, 9);
  });
});

describe("Alavanca 2 — Marcação individual no craque", () => {
  const me = tokens(80);
  const star = () => tokens(80, { set: { CA: 95 } }); // adversário com craque (CA id t9)

  it("marcar o craque REDUZ o λ criado pelo rival", () => {
    const s = star();
    expect(lambdas(me, s, { manMark: "t9" }).away).toBeLessThan(lambdas(me, s).away - 0.05);
  });

  it("tem CUSTO: meu próprio λ cai um pouco ao marcar", () => {
    const s = star();
    expect(lambdas(me, s, { manMark: "t9" }).home).toBeLessThan(lambdas(me, s).home);
  });

  it("escala com a decisividade do alvo (craque 95 corta mais que um 82)", () => {
    const s95 = tokens(80, { set: { CA: 95 } }), s82 = tokens(80, { set: { CA: 82 } });
    const cut95 = lambdas(me, s95).away - lambdas(me, s95, { manMark: "t9" }).away;
    const cut82 = lambdas(me, s82).away - lambdas(me, s82, { manMark: "t9" }).away;
    expect(cut95).toBeGreaterThan(cut82);
  });

  it("marcar um coadjuvante corta MUITO menos (a marcação 'perde o alvo')", () => {
    const s = star();
    const cutStar = lambdas(me, s).away - lambdas(me, s, { manMark: "t9" }).away; // craque (CA)
    const cutBack = lambdas(me, s).away - lambdas(me, s, { manMark: "t1" }).away; // lateral (LE)
    expect(cutStar).toBeGreaterThan(cutBack * 2);
  });

  it("sem marcação (null) ou alvo inexistente não muda o λ (sem regressão)", () => {
    const s = star();
    expect(lambdas(me, s, { manMark: null }).away).toBeCloseTo(lambdas(me, s).away, 9);
    expect(lambdas(me, s, { manMark: "zzz" }).away).toBeCloseTo(lambdas(me, s).away, 9);
  });
});

describe("§5 Probabilidade ao vivo — bate com a simulação e reage certo", () => {
  // P exibida (winProb analítica) vs frequência simulada (50k finais). Erro < 0.8pp.
  it.each([
    ["0-0 min0 igual", 0, 0, 1.4, 1.4, 0],
    ["1-0 min60 lidera", 1, 0, 1.4, 1.4, 60],
    ["0-1 min80 atrás/fim", 0, 1, 1.4, 1.4, 80],
    ["favorito λ2.0/1.0", 0, 0, 2.0, 1.0, 0],
  ])("P ≈ frequência (%s)", (_n, a, b, lh, la, m) => {
    const p = pWin(a, b, lh, la, m, true);
    const f = simWinFreq(a, b, lh, la, m, true, 50000, 13579);
    expect(Math.abs(p - f)).toBeLessThan(0.008);
  });

  it("P(vit)+P(emp)+P(der) = 1 em vários estados (sem desvio numérico)", () => {
    for (const [a, b, lh, la, m] of [[0, 0, 1.4, 1.4, 0], [2, 1, 1.1, 1.7, 70], [0, 0, 3, 0.5, 30]]) {
      const w = winProb(a, b, lh, la, m, {});
      expect(Math.abs(w.win + w.draw + w.loss - 1)).toBeLessThan(1e-12);
    }
  });

  it("reatividade: gol↑P, expulsão(−λ)↓P, relógio empurra o líder, sem mando 50%", () => {
    expect(pWin(1, 0, 1.4, 1.4, 30, true)).toBeGreaterThan(pWin(0, 0, 1.4, 1.4, 30, true)); // gol
    expect(pWin(0, 0, 1.0, 1.4, 30, true)).toBeLessThan(pWin(0, 0, 1.4, 1.4, 30, true));     // −λ
    expect(pWin(1, 0, 1.4, 1.4, 80, true)).toBeGreaterThan(pWin(1, 0, 1.4, 1.4, 40, true));  // relógio
    expect(Math.abs(pWin(0, 0, 1.4, 1.4, 0, true) - 0.5)).toBeLessThan(1e-9);                // sem mando
  });
});
