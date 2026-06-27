import { describe, it, expect } from "vitest";
import { createTournament, nextMatch, applyMatchResult, tournamentFinished, allMatches } from "./tournament.js";

function players(n) {
  return Array.from({ length: n }, (_, i) => ({ id: "p" + i, teamName: "T" + i }));
}
// joga tudo com o mandante sempre vencendo (resultado determinístico).
function playAll(t, ps) {
  let guard = 0;
  while (!tournamentFinished(t) && guard < 500) {
    const m = nextMatch(t);
    if (!m) break;
    applyMatchResult(t, m.id, { homeGoals: 2, awayGoals: 0, winner: "home", events: [], xg: [2, 0] }, ps);
    guard++;
  }
  return guard;
}

describe("tournament — mata-mata", () => {
  it("8 times: completa e produz exatamente um campeão", () => {
    const ps = players(8);
    const t = createTournament(ps, { format: "knockout", bracketSize: 8 });
    playAll(t, ps);
    expect(tournamentFinished(t)).toBe(true);
    expect(t.champion).toBeTruthy();
    expect(ps.map((p) => p.id)).toContain(t.champion);
  });

  it("6 times (não-potência de 2): byes não travam o chaveamento", () => {
    const ps = players(6);
    const t = createTournament(ps, { format: "knockout", bracketSize: 6 });
    const ran = playAll(t, ps);
    expect(ran).toBeLessThan(500); // não entrou em loop
    expect(tournamentFinished(t)).toBe(true);
    expect(t.champion).toBeTruthy();
  });

  it("todas as partidas jogadas ficam marcadas como played", () => {
    const ps = players(4);
    const t = createTournament(ps, { format: "knockout", bracketSize: 4 });
    playAll(t, ps);
    for (const m of allMatches(t)) {
      if (!m.isBye) expect(m.played).toBe(true);
    }
  });
});

describe("tournament — pontos corridos", () => {
  it("liga de 4 completa e define campeão determinístico", () => {
    const ps = players(4);
    const t1 = createTournament(ps, { format: "league", leagueSize: 4 });
    playAll(t1, ps);
    expect(tournamentFinished(t1)).toBe(true);
    expect(t1.champion).toBeTruthy();
  });
});
