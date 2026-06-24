// Motor do draft estilo 7a0: rola o dado → sai (país + Copa) → escolhe um jogador real
// daquele elenco para um slot compatível. Rerolls, regra de ouro (slot fixado não esvazia,
// só troca) e jogador único por sala (conjunto `taken`).
//
// Estas funções são puras: recebem o estado do draft e devolvem um novo estado. O redutor
// autoritativo (anfitrião, em App.jsx) é quem as chama ao receber intents.

import { WORLDCUP_SQUADS, SQUAD_BY_ID } from "../data/worldcupSquads.js";
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

// Sorteia uma seleção. kind: "team" (qualquer) | "cup" (outro ano do mesmo país, se houver).
export function rollSquad(currentSquadId, kind = "team") {
  let pool = WORLDCUP_SQUADS;
  if (kind === "cup" && currentSquadId) {
    const cur = SQUAD_BY_ID[currentSquadId];
    const sameCountry = WORLDCUP_SQUADS.filter((s) => s.code === cur.code && s.id !== cur.id);
    if (sameCountry.length) pool = sameCountry;
  } else if (currentSquadId) {
    const others = WORLDCUP_SQUADS.filter((s) => s.id !== currentSquadId);
    if (others.length) pool = others;
  }
  return rndItem(pool).id;
}

// Os jogadores do sorteio atual que ainda estão livres (não em `taken`).
export function freePlayers(squadId, taken) {
  if (!squadId) return [];
  const set = taken instanceof Set ? taken : new Set(taken);
  return (SQUAD_BY_ID[squadId]?.players || []).filter((p) => !set.has(p.id));
}

// Índices de slots vazios compatíveis com o jogador (mesmo grupo).
export function compatibleSlots(player, formation, slots) {
  const out = [];
  formation.slots.forEach((slot, i) => {
    if (slots[i] == null && slot.group === player.pos) out.push(i);
  });
  return out;
}

// O jogador pode ser escalado agora? (tem slot vazio compatível e está livre)
export function isPickable(player, formation, slots, taken) {
  const set = taken instanceof Set ? taken : new Set(taken);
  if (set.has(player.id)) return false;
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
    mgr.current = { squadId: rollSquad(null, "team") };
  }
  return d;
}

// Reroll: troca a seleção (kind team/cup), gastando 1 reroll.
export function applyReroll(draft, managerId, kind) {
  const d = structuredClone(draft);
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done || mgr.rerollsLeft <= 0) return d;
  mgr.current = { squadId: rollSquad(mgr.current?.squadId, kind) };
  mgr.rerollsLeft -= 1;
  return d;
}

// Escala um jogador num slot compatível vazio (regra de ouro: não substitui ocupado).
export function applyPick(draft, managerId, playerId, slotIndex) {
  const d = structuredClone(draft);
  const mgr = d.mgr[managerId];
  if (!mgr || mgr.done) return d;
  if (d.taken.includes(playerId)) return d; // já levado por outro
  const squad = SQUAD_BY_ID[mgr.current?.squadId];
  const player = squad?.players.find((p) => p.id === playerId);
  if (!player) return d;
  const formation = mgrFormation(mgr);
  const slot = formation.slots[slotIndex];
  if (!slot || mgr.slots[slotIndex] != null) return d; // slot inválido/ocupado
  if (slot.group !== player.pos) return d; // posição incompatível
  mgr.slots[slotIndex] = playerId;
  d.taken.push(playerId);
  // próximo sorteio automático
  if (countFilled(mgr.slots) >= formation.slots.length) {
    mgr.done = true;
    mgr.current = null;
  } else {
    mgr.current = { squadId: rollSquad(mgr.current.squadId, "team") };
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
  // valida compatibilidade de grupo nos dois sentidos
  if (slotTo.group !== pa.pos) return d;
  if (pb && slotFrom.group !== pb.pos) return d;
  mgr.slots[toIndex] = a;
  if (pb) mgr.slots[fromIndex] = b;
  else delete mgr.slots[fromIndex];
  return d;
}

function playerById(id) {
  for (const s of WORLDCUP_SQUADS) {
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
  let free = freePlayers(mgr.current.squadId, taken);
  let pickable = free
    .filter((p) => isPickable(p, formation, mgr.slots, taken))
    .sort((a, b) => b.ovr - a.ovr);
  // se nada do sorteio serve, re-sorteia algumas vezes (de graça no auto)
  let tries = 0;
  while (pickable.length === 0 && tries < 12) {
    mgr.current = { squadId: rollSquad(mgr.current.squadId, "team") };
    free = freePlayers(mgr.current.squadId, taken);
    pickable = free
      .filter((p) => isPickable(p, formation, mgr.slots, taken))
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
