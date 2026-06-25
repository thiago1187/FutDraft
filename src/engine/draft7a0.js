// Motor do draft estilo 7a0: rola o dado → sai (país + Copa) → escolhe um jogador real
// daquele elenco para um slot compatível. Rerolls, regra de ouro (slot fixado não esvazia,
// só troca) e jogador único por sala (conjunto `taken`).
//
// Estas funções são puras: recebem o estado do draft e devolvem um novo estado. O redutor
// autoritativo (anfitrião, em App.jsx) é quem as chama ao receber intents.

import { SQUADS, SQUAD_BY_ID, rollableSquads } from "../data/squads.js";
import { findFormation, DEFAULT_FORMATION } from "./formations.js";

export const REROLLS = { classic: 3, almanac: 1 };

function rndItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Estado inicial do draft de um técnico.
export function createManagerDraft(formation = DEFAULT_FORMATION, difficulty = "classic") {
  return {
    formation,
    slots: {}, // slotIndex -> playerId
    current: null, // { squadId } — o sorteio atual
    rerollsLeft: REROLLS[difficulty] ?? 3,
    done: false,
  };
}

// Sorteia uma seleção do "poolName" (todas/fortes/lendas).
// kind:
//   "team"    → país aleatório, qualquer ano (sorteio inicial e auto-pick)
//   "cup"     → "Outra copa": mesmo país, OUTRO ano
//   "country" → "Outra seleção": mesmo ano, OUTRO país
export function rollSquad(currentSquadId, kind = "team", poolName = "all") {
  let pool = rollableSquads(poolName);
  if (!pool.length) pool = SQUADS;
  const cur = currentSquadId ? SQUAD_BY_ID[currentSquadId] : null;

  if (kind === "cup" && cur) {
    const sameCountry = pool.filter((s) => s.code === cur.code && s.id !== currentSquadId);
    return rndItem(sameCountry.length ? sameCountry : pool).id;
  }

  if (kind === "country" && cur) {
    const sameYear = pool.filter((s) => s.year === cur.year && s.code !== cur.code);
    if (sameYear.length) return pickBalancedByCountry(sameYear, currentSquadId);
    // nenhum outro país nesse ano → cai para país aleatório qualquer ano
  }

  return pickBalancedByCountry(pool, currentSquadId);
}

// Sorteio em duas fases para equalizar o peso por PAÍS —
// sem isso Brasil (20 edições) teria 20× mais chance que Equador (1 edição).
function pickBalancedByCountry(pool, excludeId) {
  const byCountry = {};
  for (const s of pool) {
    if (s.id === excludeId) continue;
    (byCountry[s.code] = byCountry[s.code] || []).push(s);
  }
  const codes = Object.keys(byCountry);
  if (!codes.length) return rndItem(pool).id;
  const code = rndItem(codes);
  return rndItem(byCountry[code]).id;
}

// Um jogador já foi levado? Bloqueia a época exata (id) E a mesma PESSOA em outra
// época (personId/player_id) — assim ninguém escala dois "Pelé" de Copas diferentes.
function isTaken(p, takenIds, takenPersons) {
  if (takenIds.has(p.id)) return true;
  if (p.personId && takenPersons.has(p.personId)) return true;
  return false;
}
function asSet(v) {
  return v instanceof Set ? v : new Set(v || []);
}

// Os jogadores do sorteio atual que ainda estão livres (id e pessoa).
export function freePlayers(squadId, taken, takenPersons) {
  if (!squadId) return [];
  const ids = asSet(taken), persons = asSet(takenPersons);
  return (SQUAD_BY_ID[squadId]?.players || []).filter((p) => !isTaken(p, ids, persons));
}

// O jogador encaixa neste slot? Usa player.roles (posições específicas do banco:
// ZAG, LD, MEI, PE…) quando disponível; cai no grupo amplo (GK/DEF/MID/ATT) para
// dados estáticos sem roles. ÚNICA fonte de verdade — usada na UI e nas mutações.
export function playerFitsSlot(player, slot) {
  if (player.roles && player.roles.length) return player.roles.includes(slot.role);
  return slot.group === player.pos;
}

// Índices de slots vazios compatíveis com o jogador.
export function compatibleSlots(player, formation, slots) {
  const out = [];
  formation.slots.forEach((slot, i) => {
    if (slots[i] == null && playerFitsSlot(player, slot)) out.push(i);
  });
  return out;
}

// O jogador pode ser escalado agora? (tem slot vazio compatível e está livre)
export function isPickable(player, formation, slots, taken, takenPersons) {
  if (isTaken(player, asSet(taken), asSet(takenPersons))) return false;
  return compatibleSlots(player, formation, slots).length > 0;
}

function mgrFormation(mgr) {
  return findFormation(11, mgr.formation);
}

function countFilled(slots) {
  return Object.values(slots).filter(Boolean).length;
}

// ---- mutações (devolvem novo estado do draft) ----

// Garante que o técnico tem um sorteio atual (sorteia se não tiver). Não gasta reroll.
export function ensureRoll(draft, managerId) {
  const d = structuredClone(draft);
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done) return d;
  if (!mgr.current) {
    mgr.current = { squadId: rollSquad(null, "team", d.pool) };
  }
  return d;
}

// Reroll: troca a seleção (kind team/cup), gastando 1 reroll.
export function applyReroll(draft, managerId, kind) {
  const d = structuredClone(draft);
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done || mgr.rerollsLeft <= 0) return d;
  mgr.current = { squadId: rollSquad(mgr.current?.squadId, kind, d.pool) };
  mgr.rerollsLeft -= 1;
  return d;
}

// Escala um jogador num slot compatível vazio (regra de ouro: não substitui ocupado).
export function applyPick(draft, managerId, playerId, slotIndex) {
  const d = structuredClone(draft);
  if (!d.takenPersons) d.takenPersons = [];
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done) return d;
  if (d.taken.includes(playerId)) return d; // época exata já levada
  const squad = SQUAD_BY_ID[mgr.current?.squadId];
  const player = squad?.players.find((p) => p.id === playerId);
  if (!player) return d;
  if (player.personId && d.takenPersons.includes(player.personId)) return d; // mesma pessoa, outra época
  const formation = mgrFormation(mgr);
  const slot = formation.slots[slotIndex];
  if (!slot || mgr.slots[slotIndex] != null) return d; // slot inválido/ocupado
  if (!playerFitsSlot(player, slot)) return d; // posição incompatível
  mgr.slots[slotIndex] = playerId;
  d.taken.push(playerId);
  if (player.personId) d.takenPersons.push(player.personId);
  // próximo sorteio automático
  if (countFilled(mgr.slots) >= formation.slots.length) {
    mgr.done = true;
    mgr.current = null;
  } else {
    mgr.current = { squadId: rollSquad(mgr.current.squadId, "team", d.pool) };
  }
  d.done = allHumansDone(d);
  return d;
}

// Troca a posição de um jogador já escalado (regra de ouro permite mover de slot).
export function applyMove(draft, managerId, fromIndex, toIndex) {
  const d = structuredClone(draft);
  const mgr = d.mgr[managerId];
  if (!mgr) return d;
  const formation = mgrFormation(mgr);
  const a = mgr.slots[fromIndex];
  const b = mgr.slots[toIndex];
  if (a == null) return d;
  const pa = playerById(a);
  const pb = b != null ? playerById(b) : null;
  const slotFrom = formation.slots[fromIndex];
  const slotTo = formation.slots[toIndex];
  // valida compatibilidade por posição (roles) nos dois sentidos da troca
  if (!playerFitsSlot(pa, slotTo)) return d;
  if (pb && !playerFitsSlot(pb, slotFrom)) return d;
  mgr.slots[toIndex] = a;
  if (pb) mgr.slots[fromIndex] = b;
  else delete mgr.slots[fromIndex];
  return d;
}

function playerById(id) {
  for (const s of SQUADS) {
    const p = s.players.find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}

// Auto-completa um slot do técnico (bot ou timeout): melhor jogador compatível do sorteio.
export function autoStep(draft, managerId) {
  let d = ensureRoll(draft, managerId);
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done) return d;
  const formation = mgrFormation(mgr);
  const taken = new Set(d.taken);
  const persons = new Set(d.takenPersons || []);
  let free = freePlayers(mgr.current.squadId, taken, persons);
  let pickable = free
    .filter((p) => isPickable(p, formation, mgr.slots, taken, persons))
    .sort((a, b) => b.ovr - a.ovr);
  // se nada do sorteio serve, re-sorteia algumas vezes (de graça no auto)
  let tries = 0;
  while (pickable.length === 0 && tries < 12) {
    mgr.current = { squadId: rollSquad(mgr.current.squadId, "team", d.pool) };
    free = freePlayers(mgr.current.squadId, taken, persons);
    pickable = free
      .filter((p) => isPickable(p, formation, mgr.slots, taken, persons))
      .sort((a, b) => b.ovr - a.ovr);
    tries++;
  }
  if (pickable.length === 0) {
    mgr.done = true;
    mgr.current = null;
    d.done = allHumansDone(d);
    return d;
  }
  const best = pickable[0];
  const slot = compatibleSlots(best, formation, mgr.slots)[0];
  return applyPick(d, managerId, best.id, slot);
}

export function isMgrDone(mgr, formation) {
  return mgr.done || countFilled(mgr.slots) >= formation.slots.length;
}

// Todos os técnicos HUMANOS terminaram? (bots/seleções não draftam)
export function allHumansDone(draft) {
  return Object.entries(draft.mgr).every(([, m]) => m.done);
}

// Monta o XI (lista de jogadores) de um técnico a partir dos slots.
export function draftXI(mgr) {
  const formation = mgrFormation(mgr);
  const xi = [];
  formation.slots.forEach((slot, i) => {
    const pid = mgr.slots[i];
    if (pid) xi.push(playerById(pid));
  });
  return xi.filter(Boolean);
}
