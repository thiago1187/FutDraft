// Formações (apenas 11×11) com slots de papéis detalhados e coordenadas no campo.
// Cada slot: { role, group, x, y }. role = rótulo 7a0 (GOL/ZAG/LD/LE/VOL/MC/MEI/PE/PD/CA);
// group = GK/DEF/MID/ATT (compatibilidade com o motor e o draft).
// x = largura (0..100, esquerda→direita), y = profundidade (0 = própria defesa, 100 = ataque).

export const ROLE_GROUP = {
  GOL: "GK",
  ZAG: "DEF", LD: "DEF", LE: "DEF",
  VOL: "MID", MC: "MID", MEI: "MID",
  PE: "ATT", PD: "ATT", CA: "ATT",
};

export const ROLE_LABEL = {
  GOL: "Goleiro", ZAG: "Zagueiro", LD: "Lateral-direito", LE: "Lateral-esquerdo",
  VOL: "Volante", MC: "Meio-campo", MEI: "Meia", PE: "Ponta-esquerda", PD: "Ponta-direita", CA: "Centroavante",
};

function slots(def) {
  return def.map(([role, x, y]) => ({ role, group: ROLE_GROUP[role], x, y }));
}

function mk(name, def) {
  const s = slots(def);
  const counts = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
  s.forEach((sl) => counts[sl.group]++);
  return { name, counts, slots: s };
}

const F = [
  mk("4-3-3", [
    ["GOL", 50, 8],
    ["LE", 16, 30], ["ZAG", 38, 26], ["ZAG", 62, 26], ["LD", 84, 30],
    ["VOL", 32, 52], ["MC", 68, 52], ["MEI", 50, 64],
    ["PE", 18, 80], ["CA", 50, 84], ["PD", 82, 80],
  ]),
  mk("4-4-2", [
    ["GOL", 50, 8],
    ["LE", 16, 30], ["ZAG", 38, 26], ["ZAG", 62, 26], ["LD", 84, 30],
    ["PE", 16, 55], ["MC", 40, 52], ["MC", 60, 52], ["PD", 84, 55],
    ["CA", 38, 83], ["CA", 62, 83],
  ]),
  mk("3-5-2", [
    ["GOL", 50, 8],
    ["ZAG", 28, 26], ["ZAG", 50, 24], ["ZAG", 72, 26],
    ["LE", 12, 50], ["VOL", 38, 52], ["MC", 62, 52], ["LD", 88, 50], ["MEI", 50, 66],
    ["CA", 38, 84], ["CA", 62, 84],
  ]),
  mk("4-2-3-1", [
    ["GOL", 50, 8],
    ["LE", 16, 30], ["ZAG", 38, 26], ["ZAG", 62, 26], ["LD", 84, 30],
    ["VOL", 38, 48], ["MC", 62, 48],
    ["PE", 18, 70], ["MEI", 50, 70], ["PD", 82, 70],
    ["CA", 50, 86],
  ]),
];

export const FORMATIONS = F;
export const DEFAULT_FORMATION = "4-3-3";

export function formationsFor() {
  return F;
}

export function findFormation(_squadSize, name) {
  return F.find((f) => f.name === name) || F[0];
}

// Ordem de preferência para preencher um slot quando falta jogador exato do grupo.
const FALLBACK = {
  GK: ["GK", "DEF", "MID", "ATT"],
  DEF: ["DEF", "MID", "GK", "ATT"],
  MID: ["MID", "DEF", "ATT", "GK"],
  ATT: ["ATT", "MID", "DEF", "GK"],
};

// Escala automaticamente um elenco numa formação (para bots e auto-pick).
export function autoLineup(squad, formation) {
  const pool = squad.slice().sort((a, b) => b.ovr - a.ovr);
  const used = new Set();
  const assign = {};
  formation.slots.forEach((slot, si) => {
    let chosen = null;
    for (const group of FALLBACK[slot.group]) {
      chosen = pool.find((p) => !used.has(p.id) && p.pos === group);
      if (chosen) break;
    }
    if (!chosen) chosen = pool.find((p) => !used.has(p.id));
    if (chosen) {
      used.add(chosen.id);
      assign[si] = chosen.id;
    }
  });
  const starters = Object.values(assign);
  const bench = pool.filter((p) => !used.has(p.id)).map((p) => p.id);
  return { starters, bench, assign };
}

// Garante uma escalação válida dado o estado salvo (formação + assign) e o elenco atual.
export function resolveLineup(squad, _squadSize, saved) {
  const formation = findFormation(11, saved?.formation);
  if (saved?.assign && Object.keys(saved.assign).length) {
    const ids = new Set(squad.map((p) => p.id));
    const ok = Object.values(saved.assign).every((id) => ids.has(id));
    if (ok && Object.keys(saved.assign).length === formation.slots.length) {
      const starters = Object.values(saved.assign);
      const bench = squad.filter((p) => !starters.includes(p.id)).map((p) => p.id);
      return { formation, starters, bench, assign: saved.assign };
    }
  }
  return { formation, ...autoLineup(squad, formation) };
}
