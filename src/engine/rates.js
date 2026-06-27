// Taxas de gol (λ) estilo Dixon-Coles — CAMPO NEUTRO, SEM vantagem de mando.
// Modelo simétrico: λ_A e λ_B derivam só das forças por setor (overalls efetivos) e dos
// multiplicadores dinâmicos (tática, pressão, cartões, placar, forma). É o "backend" que
// garante que cada overall e cada decisão de tática mudam a expectativa de gols.

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Pesos por posição fina (primary_position). Fallback pelo grupo (GK/DEF/MID/ATT).
const ATT_W = { CA: 1.0, PE: 0.9, PD: 0.9, MEI: 0.62, MC: 0.42, MD: 0.42, ME: 0.42, VOL: 0.22, LD: 0.26, LE: 0.26, ZAG: 0.06, GOL: 0 };
const DEF_W = { GOL: 1.0, ZAG: 1.0, VOL: 0.62, LD: 0.5, LE: 0.5, MC: 0.32, MD: 0.28, ME: 0.28, MEI: 0.16, PE: 0.1, PD: 0.1, CA: 0.05 };
const GROUP_FALLBACK = { GK: "GOL", DEF: "ZAG", MID: "MC", ATT: "CA" };

function wOf(table, tk) {
  const w = table[tk.detail];
  if (w != null) return w;
  return table[GROUP_FALLBACK[tk.pos]] ?? 0;
}
// Overall efetivo: cansaço reduz um pouco o rendimento.
export function effOvr(tk) {
  return tk.ovr * (0.85 + 0.15 * ((tk.stamina ?? 100) / 100));
}

// Força de um setor (ataque/defesa) = média ponderada dos overalls efetivos em campo.
export function sectorStrength(tokens, kind) {
  const table = kind === "attack" ? ATT_W : DEF_W;
  let num = 0, den = 0;
  for (const tk of tokens) {
    if (tk.out) continue;
    const w = wOf(table, tk);
    num += w * effOvr(tk);
    den += w;
  }
  return den ? num / den : 70;
}

// Força por CORREDOR (esq/dir/centro) — quem joga naquele flanco. Usado pelo "foco de
// ataque / lado preferido" (Alavanca 1): concentrar num lado confronta a DEFESA do
// flanco oposto do adversário, então dá pra atacar o lado fraco do rival (matchup).
const FLANK_W = {
  esq: {
    att: { PE: 1.0, ME: 0.7, LE: 0.55, MEI: 0.22, MC: 0.15, CA: 0.25, VOL: 0.1 },
    def: { LE: 1.0, ZAG: 0.4, VOL: 0.25, MEI: 0.12, GOL: 0.15 },
  },
  dir: {
    att: { PD: 1.0, MD: 0.7, LD: 0.55, MEI: 0.22, MC: 0.15, CA: 0.25, VOL: 0.1 },
    def: { LD: 1.0, ZAG: 0.4, VOL: 0.25, MEI: 0.12, GOL: 0.15 },
  },
  centro: {
    att: { CA: 1.0, MEI: 0.7, MC: 0.55, VOL: 0.3, PE: 0.2, PD: 0.2 },
    def: { ZAG: 1.0, GOL: 0.55, VOL: 0.5, MC: 0.3 },
  },
};
export function flankStrength(tokens, side, kind) {
  const table = FLANK_W[side]?.[kind];
  if (!table) return 72;
  let num = 0, den = 0;
  for (const tk of tokens) {
    if (tk.out) continue;
    const w = table[tk.detail] ?? 0;
    if (w > 0) { num += w * effOvr(tk); den += w; }
  }
  return den ? num / den : 72;
}
const opposite = (s) => (s === "esq" ? "dir" : s === "dir" ? "esq" : "centro");

const MU = 78; // overall de referência
const SCALE = 22; // 22 pts de overall ≈ e^1 no λ
const BASE = 1.22; // gols/time/90 num confronto equilibrado
const MENT = {
  ataque: { self: 1.25, opp: 1.18 }, // ataque total: faço mais gols, MAS abro pro adversário
  // retranca: sufoca os dois. opp 0.78 (não 0.72) p/ a razão self/opp (0.80/0.78=1.026)
  // ficar ABAIXO da do ataque (1.25/1.18=1.059) → retranca não "ganha de graça" mais que
  // o ataque contra time igual (corrige a inversão de win% achada na auditoria A/B §1).
  retranca: { self: 0.8, opp: 0.78 },
  equilibrio: { self: 1, opp: 1 },
};
function mentOf(t) {
  return t.posture === "ofensivo" ? "ataque" : t.posture === "defensivo" ? "retranca" : "equilibrio";
}

// λ de cada time (por 90'), com TODOS os multiplicadores. Sem termo de mando.
export function computeLambdas(state) {
  const A = state.tokens.home, B = state.tokens.away;
  const attA = sectorStrength(A, "attack"), defA = sectorStrength(A, "defense");
  const attB = sectorStrength(B, "attack"), defB = sectorStrength(B, "defense");

  let lamA = BASE * Math.exp(((attA - MU) - (defB - MU)) / SCALE);
  let lamB = BASE * Math.exp(((attB - MU) - (defA - MU)) / SCALE);

  // Mentalidade (própria e do adversário)
  const mA = MENT[mentOf(state.tactics.home)], mB = MENT[mentOf(state.tactics.away)];
  lamA *= mA.self * mB.opp;
  lamB *= mB.self * mA.opp;

  // Pressão alta: ganho a bola mais alto (leve +) mas concedo contra-ataque (+ no adversário)
  if (state.tactics.home.marking === "pressao") { lamA *= 1.04; lamB *= 1.08; }
  if (state.tactics.away.marking === "pressao") { lamB *= 1.04; lamA *= 1.08; }

  // Verticalidade (toque↔direto): direto abre o jogo levemente nos dois lados
  lamA *= 0.97 + (state.tactics.home.build ?? 0.4) * 0.08;
  lamB *= 0.97 + (state.tactics.away.build ?? 0.4) * 0.08;

  // Linha defensiva: ALTA ganha território (ataca mais) MAS concede contra-ataque nas
  // costas — e esse RISCO ESCALA com a fragilidade da PRÓPRIA defesa (encaixe §4.4:
  // "linha alta com zaga fraca = brecha amplificada"). BAIXA = bloco fechado.
  const lineMult = (line, ownDef) => {
    if (line === "alta") {
      const frail = clamp((MU - ownDef) / SCALE, 0, 0.7); // defesa abaixo da média → frail>0
      return { self: 1.06, opp: 1.10 + frail * 0.30 };    // zaga fraca concede MUITO mais
    }
    if (line === "baixa") return { self: 0.93, opp: 0.90 };
    return { self: 1, opp: 1 };
  };
  const lnA = lineMult(state.tactics.home.line, defA);
  const lnB = lineMult(state.tactics.away.line, defB);
  lamA *= lnA.self * lnB.opp;
  lamB *= lnB.self * lnA.opp;

  // Cartões vermelhos: punido cai forte, adversário sobe
  const redsA = 11 - (state.men?.home ?? 11), redsB = 11 - (state.men?.away ?? 11);
  lamA *= Math.pow(0.7, redsA) * Math.pow(1.15, redsB);
  lamB *= Math.pow(0.7, redsB) * Math.pow(1.15, redsA);

  // Estado de jogo: quem ganha recua um pouco; quem perde se lança (e concede mais)
  const diff = state.score[0] - state.score[1];
  if (diff !== 0) {
    const prog = clamp(state.minute / 90, 0, 1);
    const k = 0.05 * Math.min(Math.abs(diff), 3) * prog;
    if (diff > 0) { lamA *= 1 - k; lamB *= 1 + k; }
    else { lamA *= 1 + k; lamB *= 1 - k; }
  }

  // Foco de ataque / lado preferido (Alavanca 1): concentrar a criação num flanco
  // confronta meu ataque DAQUELE lado com a defesa do flanco OPOSTO do adversário.
  // Atacar um flanco defensivo fraco do rival → mais xG; atacar um forte → menos.
  // "meio"/ausente = sem efeito (não regride times equilibrados).
  const sideAdj = (side, myTok, oppTok) => {
    if (side !== "esq" && side !== "dir") return 1;
    const myAtt = flankStrength(myTok, side, "att");
    const oppDef = flankStrength(oppTok, opposite(side), "def");
    return 1 + clamp(((myAtt - MU) - (oppDef - MU)) / SCALE, -0.6, 0.6) * 0.45;
  };
  lamA *= sideAdj(state.tactics.home.attackSide, A, B);
  lamB *= sideAdj(state.tactics.away.attackSide, B, A);

  // Choque de forma por partida (constante sorteada na criação)
  lamA *= state.form?.home ?? 1;
  lamB *= state.form?.away ?? 1;

  return { home: clamp(lamA, 0.12, 5), away: clamp(lamB, 0.12, 5) };
}
