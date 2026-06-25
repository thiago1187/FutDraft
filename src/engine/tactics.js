// Presets de tática (botão rápido) + ENCAIXE estilo×elenco (§4 do brief).
// Os presets só mexem nos parâmetros que o motor usa de verdade (postura, linha,
// pressão, posse/verticalidade) — nada de slider decorativo. O encaixe lê as forças
// por setor do elenco e diz se cada escolha combina (✓), é arriscada (⚠) ou perigosa (✕).

export const PRESETS = [
  { id: "tiki",     name: "Tiki-taka",     posture: "equilibrado", line: "alta",  marking: "leve",    build: 0.15 },
  { id: "gegen",    name: "Gegenpress",    posture: "ofensivo",    line: "alta",  marking: "pressao", build: 0.45 },
  { id: "contra",   name: "Contra-ataque", posture: "equilibrado", line: "baixa", marking: "leve",    build: 0.90 },
  { id: "retranca", name: "Retranca",      posture: "defensivo",   line: "baixa", marking: "leve",    build: 0.30 },
  { id: "equilib",  name: "Equilibrado",   posture: "equilibrado", line: "media", marking: "leve",    build: 0.50 },
  { id: "aereo",    name: "Jogo aéreo",    posture: "ofensivo",    line: "media", marking: "leve",    build: 0.85 },
];

// Qual preset (se algum) bate exatamente com a tática atual.
export function matchingPreset(t) {
  if (!t) return null;
  const eq = (a, b) => Math.abs((a ?? 0) - (b ?? 0)) < 0.06;
  return PRESETS.find((p) => p.posture === t.posture && p.line === t.line && p.marking === t.marking && eq(p.build, t.build)) || null;
}

const good = (aspect, msg) => ({ level: "good", aspect, msg });
const warn = (aspect, msg) => ({ level: "warn", aspect, msg });
const risk = (aspect, msg) => ({ level: "risk", aspect, msg });

// Encaixe: recebe as forças por setor (teamRatings: attack, defense, M = meio) e a
// tática; devolve uma lista de avaliações por aspecto. O bônus/risco ESCALA com o
// elenco — não é fixo (§4.4).
export function computeSynergy(ratings, t) {
  if (!ratings || !t) return [];
  const att = ratings.attack ?? 75, def = ratings.defense ?? 75, mid = ratings.M ?? 75;
  const out = [];

  // Linha defensiva
  if (t.line === "alta") {
    out.push(def >= 82 ? good("Linha alta", "defesa forte cobre as costas")
      : def >= 76 ? warn("Linha alta", "defesa mediana — risco moderado")
      : risk("Linha alta", "defesa frágil — brecha amplificada nas costas"));
  } else if (t.line === "baixa") {
    out.push(good("Linha baixa", "bloco fechado, concede menos"));
  }

  // Pressão (cansaço é emergente: stamina cai mais rápido sob pressing)
  if (t.marking === "pressao") {
    out.push(mid >= 80 ? good("Pressão alta", "meio forte sustenta a pressão")
      : mid >= 74 ? warn("Pressão alta", "meio mediano — pode ceder no fim")
      : risk("Pressão alta", "meio fraco — cansa e abre o contra-ataque"));
  }

  // Posse / verticalidade
  if ((t.build ?? 0.4) <= 0.3) {
    out.push(mid >= 80 ? good("Posse/toque", "meio forte controla o jogo")
      : mid >= 74 ? warn("Posse/toque", "meio mediano — atenção às perdas")
      : risk("Posse/toque", "meio fraco — mais perdas na saída de bola"));
  } else if ((t.build ?? 0.4) >= 0.8) {
    out.push(att >= 80 ? good("Jogo direto/aéreo", "ataque forte aproveita")
      : warn("Jogo direto/aéreo", "ataque mediano — aproveita pouco"));
  }

  // Postura
  if (t.posture === "ofensivo") {
    out.push(att >= 82 ? good("Ofensivo", "ataque forte para o jogo aberto")
      : warn("Ofensivo", "faz mais gols, mas cede espaço"));
  } else if (t.posture === "defensivo") {
    out.push(good("Defensivo", "sufoca o jogo dos dois lados"));
  }

  return out;
}
