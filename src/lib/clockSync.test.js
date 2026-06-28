import { describe, it, expect } from "vitest";
import { reconcileSpectatorView } from "./clockSync.js";

// Trava a regra de ouro: o espectador segue o host e SALTA quando fica pra trás; nunca
// avança sozinho nem ultrapassa o host. Reproduz o bug (cliente preso no min 25 enquanto
// o host terminou) e prova a reconciliação por salto.
describe("reconcileSpectatorView — relógio do espectador segue o host", () => {
  it("broadcast em dia: renderiza o snap (caso normal, posições suaves)", () => {
    const snap = { minute: 30, score: [1, 0], phase: "1T", ball: { x: 50, y: 50 } };
    const host = { minute: 29, score: [1, 0], phase: "1T" };
    expect(reconcileSpectatorView(snap, host)).toBe(snap);
  });

  it("snapshot perdido / aba dormiu: SALTA p/ o minuto do host (não fica preso no 25)", () => {
    const snap = { minute: 25, score: [0, 0], phase: "1T", ball: { x: 10, y: 20 } };
    const host = { minute: 88, score: [2, 1], phase: "2T" };
    const v = reconcileSpectatorView(snap, host);
    expect(v.minute).toBe(88);
    expect(v.score).toEqual([2, 1]);
    expect(v.phase).toBe("2T");
    expect(v.ball).toEqual({ x: 10, y: 20 }); // mantém as posições do último snap (animação)
  });

  it("nunca ultrapassa o host: snap à frente do host fica no snap", () => {
    const snap = { minute: 50, phase: "2T" };
    const host = { minute: 47, phase: "2T" };
    expect(reconcileSpectatorView(snap, host).minute).toBe(50);
  });

  it("fim de jogo do host chega pelo canal confiável mesmo empatado no minuto", () => {
    const snap = { minute: 90, phase: "2T", over: false };
    const host = { minute: 90, phase: "FIM", over: true };
    const v = reconcileSpectatorView(snap, host);
    expect(v.phase).toBe("FIM");
    expect(v.over).toBe(true);
  });

  it("sequência de snaps perdidos: o minuto exibido é monotônico (nunca regride)", () => {
    // host avança 10→40→80; o broadcast só entrega o de 10 e depois um atrasado de 25.
    let view = reconcileSpectatorView({ minute: 10, phase: "1T" }, { minute: 10, phase: "1T" });
    expect(view.minute).toBe(10);
    view = reconcileSpectatorView({ minute: 10, phase: "1T" }, { minute: 40, phase: "1T" }); // snap travou, host=40
    expect(view.minute).toBe(40);
    view = reconcileSpectatorView({ minute: 25, phase: "1T" }, { minute: 80, phase: "2T" }); // snap atrasado=25, host=80
    expect(view.minute).toBe(80); // salta pro host, não volta pro 25
  });

  it("sem broadcast ainda: usa o estado confiável do host", () => {
    const host = { minute: 12, phase: "1T" };
    expect(reconcileSpectatorView(null, host)).toBe(host);
  });

  it("sem nada: null", () => {
    expect(reconcileSpectatorView(null, null)).toBe(null);
  });
});
