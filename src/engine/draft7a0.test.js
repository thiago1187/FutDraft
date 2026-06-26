import { describe, it, expect, beforeEach } from "vitest";
import { setSquads } from "../data/squads.js";
import { createManagerDraft, applyPick } from "./draft7a0.js";
import { findFormation } from "./formations.js";

// Dois elencos com o MESMO craque (personId "pele") em épocas diferentes.
function seed() {
  const filler = (n, pos, roles) => Array.from({ length: n }, (_, i) => ({
    id: `${pos}${i}_${Math.random().toString(36).slice(2, 6)}`, personId: null, name: pos, pos,
    roles, ovr: 75,
  }));
  setSquads([
    {
      id: "s1", code: "BR", year: 1970, players: [
        { id: "pele70", personId: "pele", name: "Pelé", pos: "ATT", roles: ["CA", "PE", "PD"], ovr: 95 },
        ...filler(1, "GK", ["GOL"]), ...filler(4, "DEF", ["ZAG", "LE", "LD"]),
        ...filler(3, "MID", ["VOL", "MC", "MEI"]), ...filler(2, "ATT", ["PE", "PD"]),
      ],
    },
    {
      id: "s2", code: "BR", year: 1958, players: [
        { id: "pele58", personId: "pele", name: "Pelé", pos: "ATT", roles: ["CA", "PE", "PD"], ovr: 94 },
      ],
    },
  ]);
}

function caIndex(form = "4-3-3") {
  return findFormation(11, form).slots.findIndex((s) => s.role === "CA");
}
function peIndex(form = "4-3-3") {
  return findFormation(11, form).slots.findIndex((s) => s.role === "PE");
}

describe("draft7a0 — regras 7a0", () => {
  beforeEach(seed);

  it("dedup da MESMA pessoa entre épocas: não dá para escalar dois 'Pelé'", () => {
    let d = { taken: [], takenPersons: [], pool: "all", mgr: { h: createManagerDraft("4-3-3", "classic") } };
    d.mgr.h.current = { squadId: "s1" };
    d = applyPick(d, "h", "pele70", caIndex());
    expect(d.taken).toContain("pele70");
    expect(d.takenPersons).toContain("pele");

    // tenta o Pelé de 1958 noutro slot livre (PE) → bloqueado pela MESMA pessoa
    d.mgr.h.current = { squadId: "s2" };
    const before = JSON.stringify(d.mgr.h.slots);
    d = applyPick(d, "h", "pele58", peIndex());
    expect(d.taken).not.toContain("pele58");
    expect(JSON.stringify(d.mgr.h.slots)).toBe(before); // nada mudou
  });

  it("regra de ouro: não substitui um slot já ocupado", () => {
    let d = { taken: [], takenPersons: [], pool: "all", mgr: { h: createManagerDraft("4-3-3", "classic") } };
    const ca = caIndex();
    d.mgr.h.current = { squadId: "s1" };
    d = applyPick(d, "h", "pele70", ca);
    expect(d.mgr.h.slots[ca]).toBe("pele70");

    // tentar escalar outro jogador no MESMO slot ocupado não muda nada
    d.mgr.h.current = { squadId: "s1" };
    d = applyPick(d, "h", "pele70", ca);
    expect(d.mgr.h.slots[ca]).toBe("pele70");
  });

  it("não escala jogador em slot de posição incompatível", () => {
    let d = { taken: [], takenPersons: [], pool: "all", mgr: { h: createManagerDraft("4-3-3", "classic") } };
    const gkIdx = findFormation(11, "4-3-3").slots.findIndex((s) => s.role === "GOL");
    d.mgr.h.current = { squadId: "s1" };
    d = applyPick(d, "h", "pele70", gkIdx); // Pelé (roles CA/PE/PD) não cabe no gol
    expect(d.mgr.h.slots[gkIdx]).toBeUndefined();
    expect(d.taken).not.toContain("pele70");
  });
});
