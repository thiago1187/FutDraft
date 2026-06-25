// Registry de seleções carregado em runtime do Supabase (tabelas wc_squads / wc_players).
// O resto do motor importa SQUADS / SQUAD_BY_ID daqui (preenchidos após loadSquads).

import { supabase } from "../lib/supabase.js";

// Estado mutável (preenchido após a carga; referências resolvem em tempo de chamada).
export const SQUADS = [];
export const SQUAD_BY_ID = {};
let _loaded = false;
let _loading = null;

export function isSquadsLoaded() {
  return _loaded;
}

// bucket do banco (rótulos 7a0) -> grupo do motor
const BUCKET_GROUP = { GOL: "GK", ZAG: "DEF", MEI: "MID", ATA: "ATT" };

// FIFA-3 -> ISO-2 (para a bandeira emoji). Subdivisões/históricos tratados à parte.
const FIFA3_ISO2 = {
  ALG: "DZ", ARG: "AR", AUS: "AU", AUT: "AT", BEL: "BE", BRA: "BR", BUL: "BG",
  CHI: "CL", CIV: "CI", CMR: "CM", COL: "CO", CRC: "CR", CRO: "HR", CZE: "CZ",
  DEN: "DK", ECU: "EC", EGY: "EG", ESP: "ES", FRA: "FR", GER: "DE", GHA: "GH",
  GRE: "GR", HUN: "HU", IRL: "IE", ITA: "IT", JPN: "JP", KOR: "KR", MAR: "MA",
  MEX: "MX", NED: "NL", NGA: "NG", PAR: "PY", PER: "PE", POL: "PL", POR: "PT",
  ROU: "RO", RUS: "RU", SEN: "SN", SRB: "RS", SUI: "CH", SWE: "SE", TUR: "TR",
  UKR: "UA", URU: "UY", USA: "US",
};
const SPECIAL_FLAG = {
  ENG: "🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  SCO: "🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  WAL: "🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  NIR: "🇬🇧",
  URS: "🚩", // União Soviética (histórica)
  YUG: "🏳️", // Iugoslávia (histórica)
  TCH: "🏳️", // Tchecoslováquia (histórica)
};

export function flagFor(code3) {
  if (SPECIAL_FLAG[code3]) return SPECIAL_FLAG[code3];
  const iso2 = FIFA3_ISO2[code3];
  if (!iso2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(A + (iso2.charCodeAt(0) - 65), A + (iso2.charCodeAt(1) - 65));
}

// Código de bandeira (imagem flagcdn): ISO-2 minúsculo, ou subdivisão gb-*; null se histórico.
const ISO2_SUB = { ENG: "gb-eng", SCO: "gb-sct", WAL: "gb-wls", NIR: "gb-nir" };
export function iso2For(code3) {
  if (ISO2_SUB[code3]) return ISO2_SUB[code3];
  const iso2 = FIFA3_ISO2[code3];
  return iso2 ? iso2.toLowerCase() : null;
}

export function squadLabel(squad) {
  return `${squad.country} ${squad.year}`;
}

// Busca paginada (Supabase devolve no máx. 1000 linhas por chamada).
async function fetchAll(table, cols) {
  const out = [];
  const size = 1000;
  let from = 0;
  for (let guard = 0; guard < 30; guard++) {
    const { data, error } = await supabase.from(table).select(cols).range(from, from + size - 1);
    if (error) throw error;
    out.push(...data);
    if (data.length < size) break;
    from += size;
  }
  return out;
}

// Carrega e adapta as seleções do Supabase. Idempotente (carrega uma vez).
export async function loadSquads() {
  if (_loaded) return SQUADS;
  if (_loading) return _loading;
  _loading = (async () => {
    if (!supabase) throw new Error("Supabase não configurado");
    const [sqRows, plRows] = await Promise.all([
      fetchAll("wc_squads", "slug,country,country_code,year,avg_rating_round,legends,player_count"),
      fetchAll("wc_players", "id,squad_slug,name,number,positions,primary_position,bucket,overall,is_legend"),
    ]);

    const bySlug = {};
    for (const s of sqRows) {
      const flag = flagFor(s.country_code);
      bySlug[s.slug] = {
        id: s.slug,
        country: s.country,
        code: s.country_code,
        iso2: iso2For(s.country_code),
        year: s.year,
        flag,
        formation: "4-3-3",
        avg: s.avg_rating_round || 0,
        legends: s.legends || 0,
        players: [],
      };
    }
    for (const p of plRows) {
      const squad = bySlug[p.squad_slug];
      if (!squad) continue;
      squad.players.push({
        id: String(p.id),
        name: p.name,
        number: p.number,
        pos: BUCKET_GROUP[p.bucket] || "MID",
        detail: p.primary_position || p.bucket || "",
        ovr: p.overall,
        flag: squad.flag,
        country: squad.code,
        cup: squad.year,
        squadId: squad.id,
        isLegend: !!p.is_legend,
      });
    }

    const list = Object.values(bySlug).filter((s) => s.players.length >= 11);
    setSquads(list);
    return SQUADS;
  })();
  return _loading;
}

// Preenche o registry (também usado pelos testes com dados estáticos).
export function setSquads(arr) {
  SQUADS.length = 0;
  for (const k in SQUAD_BY_ID) delete SQUAD_BY_ID[k];
  for (const s of arr) {
    SQUADS.push(s);
    SQUAD_BY_ID[s.id] = s;
  }
  _loaded = true;
}

// Seleções elegíveis para o sorteio conforme o "pool" escolhido no lobby.
export function rollableSquads(pool = "all") {
  if (pool === "strong") {
    const strong = SQUADS.filter((s) => s.avg >= 79);
    return strong.length >= 8 ? strong : SQUADS;
  }
  if (pool === "legends") {
    const leg = SQUADS.filter((s) => (s.legends || 0) >= 3);
    return leg.length >= 8 ? leg : SQUADS;
  }
  return SQUADS;
}

// Melhor XI de uma seleção numa formação (preenche slots por grupo, melhor disponível).
const FALLBACK = {
  GK: ["GK", "DEF", "MID", "ATT"],
  DEF: ["DEF", "MID", "ATT", "GK"],
  MID: ["MID", "DEF", "ATT", "GK"],
  ATT: ["ATT", "MID", "DEF", "GK"],
};
export function squadXI(squad, formation) {
  const pool = squad.players.slice().sort((a, b) => b.ovr - a.ovr);
  const used = new Set();
  const xi = [];
  for (const slot of formation.slots) {
    let chosen = null;
    for (const g of FALLBACK[slot.group]) {
      chosen = pool.find((p) => !used.has(p.id) && p.pos === g);
      if (chosen) break;
    }
    if (!chosen) chosen = pool.find((p) => !used.has(p.id));
    if (chosen) {
      used.add(chosen.id);
      xi.push(chosen);
    }
  }
  return xi;
}

export function squadRating(squad) {
  const top = squad.players.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  return Math.round(top.reduce((s, p) => s + p.ovr, 0) / (top.length || 1));
}
