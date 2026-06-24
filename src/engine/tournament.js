// Geração e progressão do campeonato: mata-mata (knockout) e pontos corridos (league).

function shuffle(a) {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function mkMatch(homeId, awayId, round) {
  return {
    id: "m_" + Math.random().toString(36).slice(2, 10),
    round,
    homeId,
    awayId,
    result: null,
    played: false,
    isBye: false,
  };
}

export function roundLabel(numMatches) {
  switch (numMatches) {
    case 1:
      return "Final";
    case 2:
      return "Semifinal";
    case 4:
      return "Quartas de final";
    case 8:
      return "Oitavas de final";
    case 16:
      return "16-avos de final";
    default:
      return `Fase de ${numMatches * 2}`;
  }
}

// ---------- MATA-MATA ----------
function createKnockout(ids) {
  const seeds = shuffle(ids);
  const S = nextPow2(seeds.length);
  const byes = S - seeds.length;
  const entrants = [...seeds, ...Array(byes).fill(null)];

  const round0 = [];
  for (let i = 0; i < S / 2; i++) {
    const homeId = entrants[i];
    const awayId = entrants[S - 1 - i];
    const m = mkMatch(homeId, awayId, 0);
    if (awayId === null && homeId !== null) {
      m.isBye = true;
      m.played = true;
      m.result = { bye: true, winner: "home", homeGoals: 0, awayGoals: 0, events: [] };
    }
    round0.push(m);
  }
  return { format: "knockout", rounds: [round0], champion: null };
}

function winnerId(m) {
  if (!m.result) return null;
  return m.result.winner === "home" ? m.homeId : m.awayId;
}

function maybeAdvanceKnockout(t) {
  const cur = t.rounds[t.rounds.length - 1];
  if (cur.length === 1) {
    if (cur[0].played && cur[0].result) t.champion = winnerId(cur[0]);
    return t;
  }
  if (!cur.every((m) => m.played)) return t;
  const winners = cur.map(winnerId);
  const next = [];
  for (let i = 0; i < winners.length; i += 2) {
    next.push(mkMatch(winners[i], winners[i + 1], t.rounds.length));
  }
  t.rounds.push(next);
  return t;
}

// ---------- PONTOS CORRIDOS ----------
function createLeague(ids) {
  const teams = shuffle(ids);
  const arr = teams.slice();
  if (arr.length % 2 !== 0) arr.push(null);
  const m = arr.length;
  const roundsN = m - 1;
  const half = m / 2;
  const fixtures = [];
  let rot = arr.slice();
  for (let r = 0; r < roundsN; r++) {
    for (let i = 0; i < half; i++) {
      let home = rot[i];
      let away = rot[m - 1 - i];
      if (home === null || away === null) continue;
      if (r % 2 === 1) [home, away] = [away, home];
      fixtures.push(mkMatch(home, away, r));
    }
    rot = [rot[0], rot[m - 1], ...rot.slice(1, m - 1)];
  }
  return { format: "league", fixtures, champion: null };
}

export function leagueTable(t, players) {
  const map = {};
  players.forEach((p) => {
    map[p.id] = { id: p.id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 };
  });
  for (const f of t.fixtures) {
    if (!f.played || !f.result) continue;
    const h = map[f.homeId];
    const a = map[f.awayId];
    if (!h || !a) continue;
    const hg = f.result.homeGoals;
    const ag = f.result.awayGoals;
    h.P++;
    a.P++;
    h.GF += hg;
    h.GA += ag;
    a.GF += ag;
    a.GA += hg;
    if (hg > ag) {
      h.W++;
      a.L++;
      h.Pts += 3;
    } else if (ag > hg) {
      a.W++;
      h.L++;
      a.Pts += 3;
    } else {
      h.D++;
      a.D++;
      h.Pts++;
      a.Pts++;
    }
  }
  const rows = Object.values(map).map((r) => ({ ...r, GD: r.GF - r.GA }));
  rows.sort((x, y) => y.Pts - x.Pts || y.GD - x.GD || y.GF - x.GF || x.id.localeCompare(y.id));
  return rows;
}

function leagueChampion(t, players) {
  if (!t.fixtures.every((f) => f.played)) return null;
  const rows = leagueTable(t, players);
  return rows[0] ? rows[0].id : null;
}

// ---------- API GERAL ----------
export function createTournament(players, settings) {
  const ids = players.map((p) => p.id);
  const t = settings.format === "league" ? createLeague(ids) : createKnockout(ids);
  return t;
}

export function allMatches(t) {
  if (!t) return [];
  if (t.format === "league") return t.fixtures;
  return t.rounds.flat();
}

export function nextMatch(t) {
  return allMatches(t).find((m) => !m.played) || null;
}

// Aplica o resultado a uma partida (mutando o torneio passado) e avança a fase se preciso.
export function applyMatchResult(t, matchId, result, players) {
  let target = null;
  if (t.format === "league") {
    target = t.fixtures.find((f) => f.id === matchId);
  } else {
    for (const r of t.rounds) {
      const f = r.find((m) => m.id === matchId);
      if (f) {
        target = f;
        break;
      }
    }
  }
  if (!target) return t;
  target.result = result;
  target.played = true;
  if (t.format === "league") t.champion = leagueChampion(t, players);
  else maybeAdvanceKnockout(t);
  return t;
}

export function tournamentFinished(t) {
  if (!t) return false;
  if (t.format === "league") return t.fixtures.every((f) => f.played);
  return !!t.champion;
}

// Artilharia agregada do campeonato.
export function topScorers(t) {
  const tally = {};
  for (const m of allMatches(t)) {
    if (!m.played || !m.result || !m.result.events) continue;
    for (const e of m.result.events) {
      if (e.type !== "goal" || !e.scorerId) continue;
      const teamId = e.side === "home" ? m.homeId : m.awayId;
      if (!tally[e.scorerId]) {
        tally[e.scorerId] = { id: e.scorerId, name: e.scorer, teamId, goals: 0 };
      }
      tally[e.scorerId].goals++;
    }
  }
  return Object.values(tally).sort((a, b) => b.goals - a.goals);
}

// Para o chaveamento: rótulo de cada rodada existente.
export function knockoutRoundLabels(t) {
  return t.rounds.map((r) => roundLabel(r.length));
}
