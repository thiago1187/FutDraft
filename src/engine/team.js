import { findFormation } from "./formations.js";
import { SQUAD_BY_ID, squadXI } from "../data/squads.js";
import { draftXI } from "./draft7a0.js";

// Monta o time de um participante para a simulação.
// - Bot = seleção real (squadId): usa o melhor XI da seleção na sua formação histórica.
// - Humano = XI montado no draft 7a0 (slots → jogadores), na formação escolhida.
export function buildTeam(state, managerId) {
  const mgr = state.players.find((p) => p.id === managerId);

  if (mgr?.isBot && mgr.squadId) {
    const squad = SQUAD_BY_ID[mgr.squadId];
    const formation = findFormation(11, squad.formation);
    const xi = squadXI(squad, formation);
    const bench = squad.players.filter((p) => !xi.some((x) => x.id === p.id));
    return { id: managerId, name: mgr.teamName, squad: xi, bench, fullSquad: squad.players, lineup: { formation } };
  }

  const md = state.draft?.mgr?.[managerId];
  const formation = findFormation(11, md?.formation);
  const xi = md ? draftXI(md) : [];
  // Sem reservas para humanos (decisão do jogo): o elenco é só o XI draftado.
  return {
    id: managerId,
    name: mgr?.teamName || "Time",
    squad: xi,
    bench: [],
    fullSquad: xi,
    lineup: { formation },
  };
}
