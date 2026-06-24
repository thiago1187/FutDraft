import { FIRST, LAST, NICK } from "./names.js";
import { REAL_PLAYERS, COUNTRY, CUPS, flagOf } from "./playersData.js";

// Grupos de posição usados em todo o motor.
export const POSITIONS = ["GK", "DEF", "MID", "ATT"];

export const POS_LABEL = {
  GK: "Goleiro",
  DEF: "Defensor",
  MID: "Meio-campo",
  ATT: "Atacante",
};

export const POS_COLOR = {
  GK: "#ffd23f",
  DEF: "#5ac8fa",
  MID: "#2bd66a",
  ATT: "#ff7a59",
};

// Mix-alvo de posições no pool (soma ≈ 1).
const MIX = { GK: 0.14, DEF: 0.32, MID: 0.31, ATT: 0.23 };

// Temas de pool: filtram o dataset de craques reais.
export const POOL_THEMES = {
  all: { label: "Todas as Copas", desc: "1958 → 2022", filter: () => true },
  modern: { label: "Era moderna", desc: "1998 → 2022", filter: (p) => p.cup >= 1998 },
  legends: { label: "Só lendas", desc: "Apenas os craques 87+", filter: (p) => p.ovr >= 87 },
};

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const DETAIL_BY_POS = {
  GK: "Goleiro",
  DEF: "Zagueiro",
  MID: "Meia",
  ATT: "Atacante",
};

// Overall fictício: maioria mediano, poucos craques (fallback quando o dataset acaba).
function genOvr() {
  const r = Math.random();
  let base;
  if (r < 0.04) base = 86 + Math.random() * 8;
  else if (r < 0.18) base = 79 + Math.random() * 7;
  else if (r < 0.55) base = 70 + Math.random() * 9;
  else base = 58 + Math.random() * 12;
  return Math.round(Math.min(94, base));
}

const COUNTRY_CODES = Object.keys(COUNTRY);

// Cria um jogador fictício (preenchimento) já no formato do dataset real.
function makeFictional(pos, idNum, usedNames) {
  let name;
  let tries = 0;
  do {
    name = Math.random() < 0.12 ? rand(NICK) : `${rand(FIRST)} ${rand(LAST)}`;
    tries++;
  } while (usedNames.has(name) && tries < 15);
  usedNames.add(name);
  const country = rand(COUNTRY_CODES);
  return {
    id: `f${idNum}`,
    name,
    country,
    flag: flagOf(country),
    cup: rand(CUPS),
    pos,
    detail: DETAIL_BY_POS[pos],
    ovr: genOvr(),
  };
}

// Gera um pool: amostra craques reais respeitando o mix de posições e o tema; completa
// com jogadores fictícios apenas se o dataset não cobrir o tamanho pedido.
export function generatePool(size = 160, { theme = "all" } = {}) {
  const themeFilter = (POOL_THEMES[theme] || POOL_THEMES.all).filter;
  const byPos = { GK: [], DEF: [], MID: [], ATT: [] };
  for (const p of REAL_PLAYERS) {
    if (themeFilter(p)) byPos[p.pos].push(p);
  }
  POSITIONS.forEach((pos) => (byPos[pos] = shuffle(byPos[pos])));

  const want = {};
  POSITIONS.forEach((pos) => (want[pos] = Math.max(1, Math.round(size * MIX[pos]))));

  const players = [];
  const usedNames = new Set();
  let fid = 1;
  for (const pos of POSITIONS) {
    const real = byPos[pos];
    for (let i = 0; i < want[pos]; i++) {
      if (i < real.length) {
        players.push(real[i]);
        usedNames.add(real[i].name);
      } else {
        players.push(makeFictional(pos, fid++, usedNames));
      }
    }
  }

  return shuffle(players);
}
