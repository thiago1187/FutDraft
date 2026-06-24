// Seleções nacionais reais de Copas do Mundo, com escalações reais.
// Cada jogador: [nome, grupo, detalhe, rating]. Grupos: GK / DEF / MID / ATT
// (compatíveis com o motor). Ratings são heurísticos (craques mais altos), consistentes.
// Integridade: cada par (país, ano) realmente disputou aquela Copa.

import { flagOf, countryName } from "../engine/playersData.js";

// [nome, pos, detalhe, rating]
const SQUADS = [
  {
    id: "BRA-1970", country: "Brasil", code: "BR", year: 1970, formation: "4-3-3",
    players: [
      ["Félix", "GK", "Goleiro", 80],
      ["Carlos Alberto", "DEF", "Lateral-direito", 88],
      ["Brito", "DEF", "Zagueiro", 82],
      ["Piazza", "DEF", "Zagueiro", 83],
      ["Everaldo", "DEF", "Lateral-esquerdo", 81],
      ["Clodoaldo", "MID", "Volante", 84],
      ["Gérson", "MID", "Meia", 88],
      ["Rivelino", "MID", "Meia", 89],
      ["Jairzinho", "ATT", "Ponta-direita", 89],
      ["Tostão", "ATT", "Centroavante", 88],
      ["Pelé", "ATT", "Atacante", 95],
      ["Paulo Cézar", "MID", "Meia", 80],
      ["Roberto Miranda", "ATT", "Centroavante", 78],
    ],
  },
  {
    id: "BRA-1982", country: "Brasil", code: "BR", year: 1982, formation: "4-3-3",
    players: [
      ["Waldir Peres", "GK", "Goleiro", 78],
      ["Leandro", "DEF", "Lateral-direito", 85],
      ["Oscar", "DEF", "Zagueiro", 83],
      ["Luizinho", "DEF", "Zagueiro", 82],
      ["Júnior", "DEF", "Lateral-esquerdo", 85],
      ["Toninho Cerezo", "MID", "Volante", 83],
      ["Falcão", "MID", "Meia", 88],
      ["Sócrates", "MID", "Meia", 90],
      ["Zico", "MID", "Meia", 91],
      ["Éder", "ATT", "Ponta-esquerda", 85],
      ["Serginho", "ATT", "Centroavante", 78],
      ["Paulo Isidoro", "ATT", "Ponta-direita", 79],
      ["Renato", "ATT", "Centroavante", 76],
    ],
  },
  {
    id: "BRA-2002", country: "Brasil", code: "BR", year: 2002, formation: "3-5-2",
    players: [
      ["Marcos", "GK", "Goleiro", 84],
      ["Lúcio", "DEF", "Zagueiro", 85],
      ["Roque Júnior", "DEF", "Zagueiro", 81],
      ["Edmílson", "DEF", "Zagueiro", 82],
      ["Cafu", "DEF", "Lateral-direito", 88],
      ["Roberto Carlos", "DEF", "Lateral-esquerdo", 88],
      ["Gilberto Silva", "MID", "Volante", 82],
      ["Kléberson", "MID", "Volante", 80],
      ["Ronaldinho", "MID", "Meia", 90],
      ["Rivaldo", "MID", "Meia", 90],
      ["Ronaldo", "ATT", "Centroavante", 94],
      ["Juninho", "MID", "Meia", 80],
      ["Denílson", "ATT", "Ponta-esquerda", 80],
    ],
  },
  {
    id: "BRA-2022", country: "Brasil", code: "BR", year: 2022, formation: "4-3-3",
    players: [
      ["Alisson", "GK", "Goleiro", 88],
      ["Danilo", "DEF", "Lateral-direito", 82],
      ["Marquinhos", "DEF", "Zagueiro", 87],
      ["Thiago Silva", "DEF", "Zagueiro", 86],
      ["Éder Militão", "DEF", "Zagueiro", 84],
      ["Casemiro", "MID", "Volante", 87],
      ["Bruno Guimarães", "MID", "Volante", 83],
      ["Lucas Paquetá", "MID", "Meia", 83],
      ["Raphinha", "ATT", "Ponta-direita", 84],
      ["Richarlison", "ATT", "Centroavante", 82],
      ["Vinícius Júnior", "ATT", "Ponta-esquerda", 86],
      ["Neymar", "ATT", "Atacante", 89],
      ["Antony", "ATT", "Ponta-direita", 80],
    ],
  },
  {
    id: "ARG-1986", country: "Argentina", code: "AR", year: 1986, formation: "3-5-2",
    players: [
      ["Nery Pumpido", "GK", "Goleiro", 80],
      ["José Luis Brown", "DEF", "Zagueiro", 81],
      ["Oscar Ruggeri", "DEF", "Zagueiro", 84],
      ["José Luis Cuciuffo", "DEF", "Zagueiro", 79],
      ["Julio Olarticoechea", "DEF", "Lateral-esquerdo", 80],
      ["Sergio Batista", "MID", "Volante", 81],
      ["Ricardo Giusti", "MID", "Volante", 82],
      ["Héctor Enrique", "MID", "Meia", 80],
      ["Jorge Burruchaga", "MID", "Meia", 84],
      ["Diego Maradona", "MID", "Meia", 97],
      ["Jorge Valdano", "ATT", "Centroavante", 85],
      ["Pedro Pasculli", "ATT", "Centroavante", 78],
    ],
  },
  {
    id: "ARG-2022", country: "Argentina", code: "AR", year: 2022, formation: "4-4-2",
    players: [
      ["Emiliano Martínez", "GK", "Goleiro", 86],
      ["Nahuel Molina", "DEF", "Lateral-direito", 81],
      ["Cristian Romero", "DEF", "Zagueiro", 84],
      ["Nicolás Otamendi", "DEF", "Zagueiro", 83],
      ["Nicolás Tagliafico", "DEF", "Lateral-esquerdo", 81],
      ["Rodrigo De Paul", "MID", "Volante", 83],
      ["Enzo Fernández", "MID", "Volante", 84],
      ["Alexis Mac Allister", "MID", "Meia", 83],
      ["Ángel Di María", "ATT", "Ponta-direita", 85],
      ["Lionel Messi", "ATT", "Atacante", 93],
      ["Julián Álvarez", "ATT", "Centroavante", 83],
      ["Lautaro Martínez", "ATT", "Centroavante", 84],
    ],
  },
  {
    id: "FRA-1998", country: "França", code: "FR", year: 1998, formation: "4-3-3",
    players: [
      ["Fabien Barthez", "GK", "Goleiro", 85],
      ["Lilian Thuram", "DEF", "Lateral-direito", 87],
      ["Marcel Desailly", "DEF", "Zagueiro", 87],
      ["Laurent Blanc", "DEF", "Zagueiro", 85],
      ["Bixente Lizarazu", "DEF", "Lateral-esquerdo", 85],
      ["Didier Deschamps", "MID", "Volante", 84],
      ["Emmanuel Petit", "MID", "Volante", 83],
      ["Zinedine Zidane", "MID", "Meia", 93],
      ["Youri Djorkaeff", "MID", "Meia", 84],
      ["Thierry Henry", "ATT", "Ponta-esquerda", 86],
      ["Stéphane Guivarc'h", "ATT", "Centroavante", 76],
      ["David Trezeguet", "ATT", "Centroavante", 82],
    ],
  },
  {
    id: "FRA-2018", country: "França", code: "FR", year: 2018, formation: "4-3-3",
    players: [
      ["Hugo Lloris", "GK", "Goleiro", 86],
      ["Benjamin Pavard", "DEF", "Lateral-direito", 82],
      ["Raphaël Varane", "DEF", "Zagueiro", 87],
      ["Samuel Umtiti", "DEF", "Zagueiro", 83],
      ["Lucas Hernández", "DEF", "Lateral-esquerdo", 83],
      ["N'Golo Kanté", "MID", "Volante", 88],
      ["Paul Pogba", "MID", "Volante", 86],
      ["Blaise Matuidi", "MID", "Meia", 82],
      ["Kylian Mbappé", "ATT", "Ponta-direita", 89],
      ["Antoine Griezmann", "ATT", "Atacante", 88],
      ["Olivier Giroud", "ATT", "Centroavante", 83],
      ["Ousmane Dembélé", "ATT", "Ponta-esquerda", 82],
    ],
  },
  {
    id: "ITA-1982", country: "Itália", code: "IT", year: 1982, formation: "3-5-2",
    players: [
      ["Dino Zoff", "GK", "Goleiro", 86],
      ["Claudio Gentile", "DEF", "Zagueiro", 84],
      ["Gaetano Scirea", "DEF", "Líbero", 86],
      ["Fulvio Collovati", "DEF", "Zagueiro", 80],
      ["Antonio Cabrini", "DEF", "Lateral-esquerdo", 84],
      ["Gabriele Oriali", "MID", "Volante", 80],
      ["Marco Tardelli", "MID", "Volante", 84],
      ["Giancarlo Antognoni", "MID", "Meia", 84],
      ["Bruno Conti", "MID", "Ponta-direita", 83],
      ["Paolo Rossi", "ATT", "Centroavante", 87],
      ["Francesco Graziani", "ATT", "Centroavante", 80],
      ["Alessandro Altobelli", "ATT", "Centroavante", 80],
    ],
  },
  {
    id: "ITA-2006", country: "Itália", code: "IT", year: 2006, formation: "4-4-2",
    players: [
      ["Gianluigi Buffon", "GK", "Goleiro", 90],
      ["Gianluca Zambrotta", "DEF", "Lateral-direito", 84],
      ["Fabio Cannavaro", "DEF", "Zagueiro", 90],
      ["Marco Materazzi", "DEF", "Zagueiro", 83],
      ["Fabio Grosso", "DEF", "Lateral-esquerdo", 82],
      ["Gennaro Gattuso", "MID", "Volante", 83],
      ["Andrea Pirlo", "MID", "Volante", 89],
      ["Mauro Camoranesi", "MID", "Ponta-direita", 81],
      ["Francesco Totti", "MID", "Meia", 88],
      ["Luca Toni", "ATT", "Centroavante", 84],
      ["Alessandro Del Piero", "ATT", "Atacante", 87],
      ["Filippo Inzaghi", "ATT", "Centroavante", 83],
    ],
  },
  {
    id: "DEU-1974", country: "Alemanha", code: "DE", year: 1974, formation: "4-3-3",
    players: [
      ["Sepp Maier", "GK", "Goleiro", 85],
      ["Berti Vogts", "DEF", "Lateral-direito", 84],
      ["Franz Beckenbauer", "DEF", "Líbero", 92],
      ["Hans-Georg Schwarzenbeck", "DEF", "Zagueiro", 80],
      ["Paul Breitner", "DEF", "Lateral-esquerdo", 85],
      ["Rainer Bonhof", "MID", "Volante", 82],
      ["Wolfgang Overath", "MID", "Meia", 84],
      ["Uli Hoeneß", "MID", "Meia", 83],
      ["Jürgen Grabowski", "ATT", "Ponta-direita", 82],
      ["Gerd Müller", "ATT", "Centroavante", 90],
      ["Bernd Hölzenbein", "ATT", "Ponta-esquerda", 81],
      ["Jupp Heynckes", "ATT", "Centroavante", 80],
    ],
  },
  {
    id: "DEU-2014", country: "Alemanha", code: "DE", year: 2014, formation: "4-3-3",
    players: [
      ["Manuel Neuer", "GK", "Goleiro", 91],
      ["Philipp Lahm", "DEF", "Lateral-direito", 87],
      ["Jérôme Boateng", "DEF", "Zagueiro", 85],
      ["Mats Hummels", "DEF", "Zagueiro", 86],
      ["Benedikt Höwedes", "DEF", "Lateral-esquerdo", 80],
      ["Bastian Schweinsteiger", "MID", "Volante", 88],
      ["Sami Khedira", "MID", "Volante", 83],
      ["Toni Kroos", "MID", "Meia", 88],
      ["Thomas Müller", "ATT", "Ponta-direita", 86],
      ["Miroslav Klose", "ATT", "Centroavante", 84],
      ["Mesut Özil", "MID", "Meia", 86],
      ["Mario Götze", "ATT", "Atacante", 83],
    ],
  },
  {
    id: "NLD-1974", country: "Holanda", code: "NL", year: 1974, formation: "4-3-3",
    players: [
      ["Jan Jongbloed", "GK", "Goleiro", 78],
      ["Wim Suurbier", "DEF", "Lateral-direito", 81],
      ["Wim Rijsbergen", "DEF", "Zagueiro", 79],
      ["Ruud Krol", "DEF", "Zagueiro", 85],
      ["Arie Haan", "MID", "Volante", 83],
      ["Wim Jansen", "MID", "Volante", 81],
      ["Wim van Hanegem", "MID", "Meia", 85],
      ["Johan Neeskens", "MID", "Meia", 86],
      ["Johnny Rep", "ATT", "Ponta-direita", 83],
      ["Johan Cruyff", "ATT", "Atacante", 94],
      ["Rob Rensenbrink", "ATT", "Ponta-esquerda", 85],
      ["Piet Keizer", "ATT", "Ponta-esquerda", 80],
    ],
  },
  {
    id: "NLD-2010", country: "Holanda", code: "NL", year: 2010, formation: "4-3-3",
    players: [
      ["Maarten Stekelenburg", "GK", "Goleiro", 82],
      ["Gregory van der Wiel", "DEF", "Lateral-direito", 80],
      ["John Heitinga", "DEF", "Zagueiro", 81],
      ["Joris Mathijsen", "DEF", "Zagueiro", 80],
      ["Giovanni van Bronckhorst", "DEF", "Lateral-esquerdo", 83],
      ["Mark van Bommel", "MID", "Volante", 83],
      ["Nigel de Jong", "MID", "Volante", 82],
      ["Wesley Sneijder", "MID", "Meia", 88],
      ["Arjen Robben", "ATT", "Ponta-direita", 89],
      ["Robin van Persie", "ATT", "Centroavante", 86],
      ["Dirk Kuyt", "ATT", "Ponta-esquerda", 81],
      ["Rafael van der Vaart", "MID", "Meia", 83],
    ],
  },
  {
    id: "ENG-1966", country: "Inglaterra", code: "ENG", year: 1966, formation: "4-4-2",
    players: [
      ["Gordon Banks", "GK", "Goleiro", 88],
      ["George Cohen", "DEF", "Lateral-direito", 80],
      ["Jack Charlton", "DEF", "Zagueiro", 83],
      ["Bobby Moore", "DEF", "Zagueiro", 89],
      ["Ray Wilson", "DEF", "Lateral-esquerdo", 81],
      ["Nobby Stiles", "MID", "Volante", 81],
      ["Alan Ball", "MID", "Meia", 83],
      ["Bobby Charlton", "MID", "Meia", 90],
      ["Martin Peters", "MID", "Meia", 83],
      ["Geoff Hurst", "ATT", "Centroavante", 85],
      ["Roger Hunt", "ATT", "Centroavante", 82],
      ["Jimmy Greaves", "ATT", "Atacante", 85],
    ],
  },
  {
    id: "ESP-2010", country: "Espanha", code: "ES", year: 2010, formation: "4-3-3",
    players: [
      ["Iker Casillas", "GK", "Goleiro", 90],
      ["Sergio Ramos", "DEF", "Lateral-direito", 88],
      ["Gerard Piqué", "DEF", "Zagueiro", 86],
      ["Carles Puyol", "DEF", "Zagueiro", 87],
      ["Joan Capdevila", "DEF", "Lateral-esquerdo", 80],
      ["Sergio Busquets", "MID", "Volante", 86],
      ["Xabi Alonso", "MID", "Volante", 86],
      ["Xavi", "MID", "Meia", 90],
      ["Andrés Iniesta", "MID", "Meia", 90],
      ["David Villa", "ATT", "Centroavante", 87],
      ["Pedro", "ATT", "Ponta-direita", 82],
      ["Fernando Torres", "ATT", "Centroavante", 84],
    ],
  },
  {
    id: "URU-1950", country: "Uruguai", code: "UY", year: 1950, formation: "4-3-3",
    players: [
      ["Roque Máspoli", "GK", "Goleiro", 80],
      ["Matías González", "DEF", "Zagueiro", 79],
      ["Eusebio Tejera", "DEF", "Lateral-esquerdo", 79],
      ["Schubert Gambetta", "DEF", "Zagueiro", 78],
      ["Víctor Rodríguez Andrade", "MID", "Volante", 82],
      ["Obdulio Varela", "MID", "Volante", 86],
      ["Julio Pérez", "MID", "Meia", 80],
      ["Rubén Morán", "ATT", "Ponta-esquerda", 78],
      ["Alcides Ghiggia", "ATT", "Ponta-direita", 84],
      ["Óscar Míguez", "ATT", "Centroavante", 83],
      ["Juan Alberto Schiaffino", "ATT", "Atacante", 88],
    ],
  },
  {
    id: "SCO-1974", country: "Escócia", code: "SCO", year: 1974, formation: "4-4-2",
    players: [
      ["David Harvey", "GK", "Goleiro", 79],
      ["Sandy Jardine", "DEF", "Lateral-direito", 80],
      ["Jim Holton", "DEF", "Zagueiro", 79],
      ["Martin Buchan", "DEF", "Zagueiro", 81],
      ["Danny McGrain", "DEF", "Lateral-esquerdo", 83],
      ["Billy Bremner", "MID", "Volante", 84],
      ["David Hay", "MID", "Volante", 81],
      ["Peter Lorimer", "MID", "Meia", 82],
      ["Willie Morgan", "MID", "Ponta-direita", 80],
      ["Kenny Dalglish", "ATT", "Atacante", 85],
      ["Joe Jordan", "ATT", "Centroavante", 81],
      ["Denis Law", "ATT", "Atacante", 84],
    ],
  },
];

// Expande para objetos de jogador com id estável e bandeira.
export const WORLDCUP_SQUADS = SQUADS.map((s) => ({
  id: s.id,
  country: s.country,
  code: s.code,
  year: s.year,
  flag: flagOf(s.code),
  formation: s.formation,
  players: s.players.map(([name, pos, detail, rating], i) => ({
    id: `${s.id}-${i + 1}`,
    name,
    pos,
    detail,
    ovr: rating,
    country: s.code,
    flag: flagOf(s.code),
    cup: s.year,
    squadId: s.id,
  })),
}));

export const SQUAD_BY_ID = Object.fromEntries(WORLDCUP_SQUADS.map((s) => [s.id, s]));

export function squadLabel(squad) {
  return `${countryName(squad.code)} ${squad.year}`;
}

// Melhor XI de um squad numa formação (preenche slots por grupo, melhor disponível).
export function squadXI(squad, formation) {
  const pool = squad.players.slice().sort((a, b) => b.ovr - a.ovr);
  const used = new Set();
  const xi = [];
  const FALLBACK = {
    GK: ["GK", "DEF", "MID", "ATT"],
    DEF: ["DEF", "MID", "ATT", "GK"],
    MID: ["MID", "DEF", "ATT", "GK"],
    ATT: ["ATT", "MID", "DEF", "GK"],
  };
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
  return Math.round(top.reduce((s, p) => s + p.ovr, 0) / top.length);
}
