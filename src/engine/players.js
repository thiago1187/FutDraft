import { FIRST, LAST, NICK } from "./names.js";

export const POSITIONS = ["GOL", "ZAG", "MEI", "ATA"];

export const POS_LABEL = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  MEI: "Meia",
  ATA: "Atacante",
};

export const POS_COLOR = {
  GOL: "#ffd23f",
  ZAG: "#5ac8fa",
  MEI: "#2bd66a",
  ATA: "#ff7a59",
};

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Distribuição de overall: maioria mediano, poucos craques.
function genOvr() {
  const r = Math.random();
  let base;
  if (r < 0.04) base = 86 + Math.random() * 8; // craques 86-94
  else if (r < 0.18) base = 79 + Math.random() * 7; // muito bons 79-86
  else if (r < 0.55) base = 70 + Math.random() * 9; // bons 70-79
  else base = 58 + Math.random() * 12; // elenco 58-70
  return Math.round(Math.min(94, base));
}

// Gera um pool com mix de posições suficiente para qualquer número de técnicos.
export function generatePool(size = 160) {
  const counts = {
    GOL: Math.round(size * 0.14),
    ZAG: Math.round(size * 0.32),
    MEI: Math.round(size * 0.31),
    ATA: Math.round(size * 0.23),
  };
  const posList = [];
  for (const pos of POSITIONS) {
    for (let i = 0; i < counts[pos]; i++) posList.push(pos);
  }
  while (posList.length < size) posList.push("MEI");
  posList.length = size;

  const used = new Set();
  const players = [];
  let id = 1;
  for (const pos of posList) {
    let name;
    let tries = 0;
    do {
      if (Math.random() < 0.12) name = rand(NICK);
      else name = `${rand(FIRST)} ${rand(LAST)}`;
      tries++;
    } while (used.has(name) && tries < 15);
    used.add(name);
    players.push({ id: `p${id++}`, name, pos, ovr: genOvr() });
  }

  // embaralha
  for (let i = players.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [players[i], players[j]] = [players[j], players[i]];
  }
  return players;
}
