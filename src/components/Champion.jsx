import { useEffect, useMemo, useState } from "react";
import { topScorers, allMatches, finalStandings, leagueTable } from "../engine/tournament.js";
import { buildTeam } from "../engine/team.js";
import { findFormation } from "../engine/formations.js";
import { playerFitsSlot } from "../engine/draft7a0.js";
import { POS_COLOR } from "../engine/players.js";
import { Avatar, Flag } from "./bits.jsx";

function lastName(name = "") {
  const p = name.split(" ");
  return p.length > 1 ? p[p.length - 1] : p[0];
}

// Melhor XI do campeonato: por nota (overall), o melhor jogador de cada posição
// entre TODOS os titulares de todos os times, sem repetir a mesma pessoa.
function bestEleven(pool, formation) {
  const sorted = pool.slice().sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  const usedIds = new Set();
  const usedPersons = new Set();
  const take = (test) => {
    for (const p of sorted) {
      if (usedIds.has(p.id)) continue;
      if (p.personId && usedPersons.has(p.personId)) continue;
      if (test(p)) {
        usedIds.add(p.id);
        if (p.personId) usedPersons.add(p.personId);
        return p;
      }
    }
    return null;
  };
  return formation.slots.map((slot) => {
    let player = take((p) => playerFitsSlot(p, slot)); // posição exata
    if (!player) player = take((p) => slot.group === p.pos); // mesmo grupo
    if (!player) player = take(() => true); // qualquer um livre
    return { slot, player };
  });
}

// Mini-campo com a Seleção do campeonato (bandeira + nota por jogador).
function BestXIPitch({ xi }) {
  return (
    <div className="champ-pitch">
      <div className="champ-pitch-grass" />
      <svg className="champ-pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="0.5">
          <line x1="2" y1="50" x2="98" y2="50" />
          <circle cx="50" cy="50" r="11" />
          <rect x="32" y="2" width="36" height="12" />
          <rect x="32" y="86" width="36" height="12" />
        </g>
      </svg>
      {xi.map(({ slot, player }, i) => (
        <div key={i} className="champ-pl" style={{ left: `${slot.x}%`, bottom: `${slot.y}%` }}>
          <span className="champ-pl-disc" style={{ borderColor: POS_COLOR[player?.pos] || "#999" }}>
            {player ? (
              <Flag iso2={player.iso2} src={player.flagSrc} emoji={player.flag} round className="champ-pl-flag" />
            ) : (
              <span className="champ-pl-role">{slot.role}</span>
            )}
            {player && <span className="champ-pl-ovr">{player.ovr}</span>}
          </span>
          <span className="champ-pl-name">{player ? lastName(player.name) : ""}</span>
        </div>
      ))}
    </div>
  );
}

// Procura um 7×0 (placar lendário do 7a0) feito pelo campeão.
function findSevenNil(t, champId) {
  for (const m of allMatches(t)) {
    if (!m.played || !m.result) continue;
    const { homeGoals: h, awayGoals: a } = m.result;
    if (h >= 7 && a === 0 && m.homeId === champId) return true;
    if (a >= 7 && h === 0 && m.awayId === champId) return true;
  }
  return false;
}

// Campanha do campeão (vitórias/empates/derrotas, gols, aproveitamento).
function champRecord(t, champId) {
  let W = 0, D = 0, L = 0, GF = 0, GA = 0, games = 0, pts = 0;
  for (const m of allMatches(t)) {
    if (!m.played || m.isBye || !m.result) continue;
    if (m.homeId !== champId && m.awayId !== champId) continue;
    const home = m.homeId === champId;
    const gf = home ? m.result.homeGoals : m.result.awayGoals;
    const ga = home ? m.result.awayGoals : m.result.homeGoals;
    GF += gf; GA += ga; games++;
    if (gf > ga) { W++; pts += 3; }
    else if (gf < ga) { L++; }
    else { D++; pts += 1; }
  }
  const apr = games ? Math.round((100 * pts) / (3 * games)) : 0;
  return { W, D, L, GF, GA, games, pts, apr };
}

// Placar da decisão (final do mata-mata), na ótica do campeão.
function finalInfo(t, champId) {
  if (t.format !== "knockout" || !t.rounds?.length) return null;
  const last = t.rounds[t.rounds.length - 1];
  const fm = last && last[0];
  if (!fm || !fm.result) return null;
  const home = fm.homeId === champId;
  const gf = home ? fm.result.homeGoals : fm.result.awayGoals;
  const ga = home ? fm.result.awayGoals : fm.result.homeGoals;
  let pens = null;
  if (fm.result.pens) {
    const pf = home ? fm.result.pens.home : fm.result.pens.away;
    const pa = home ? fm.result.pens.away : fm.result.pens.home;
    pens = `${pf}-${pa} pên`;
  }
  return { gf, ga, pens };
}

function Confetti() {
  const reduce =
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return null;
  const colors = ["#2bd66a", "#ffd23f", "#ff7a59", "#5ac8fa", "#ff5a8a"];
  const pieces = Array.from({ length: 70 });
  return (
    <div className="confetti" aria-hidden>
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 2.5;
        const dur = 2.6 + Math.random() * 2.2;
        const c = colors[i % colors.length];
        const size = 6 + Math.random() * 7;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: left + "%",
              background: c,
              width: size,
              height: size * 1.4,
              animationDelay: delay + "s",
              animationDuration: dur + "s",
            }}
          />
        );
      })}
    </div>
  );
}

export default function Champion({ state, isHost, actions }) {
  const t = state.tournament;
  const players = state.players;
  const champ = players.find((p) => p.id === t.champion);
  const scorers = topScorers(t);
  const top = scorers[0];
  const topTeam = top && players.find((p) => p.id === top.teamId);
  const sevenNil = findSevenNil(t, t.champion);
  const rec = champRecord(t, t.champion);
  const fin = finalInfo(t, t.champion);
  const isLeague = t.format === "league" || (t.fixtures && !t.rounds);
  const standings = finalStandings(t, players);
  const leagueRows = isLeague ? leagueTable(t, players) : [];
  const finalLabel = fin
    ? `${fin.gf} — ${fin.ga}${fin.pens ? ` (${fin.pens})` : ""}`
    : `${rec.W}V ${rec.D}E ${rec.L}D`;

  // Seleção do campeonato: melhor XI por nota entre os titulares de TODOS os times.
  const bestXI = useMemo(() => {
    const pool = [];
    for (const pl of players) {
      const team = buildTeam(state, pl.id);
      for (const sp of team.squad || []) if (sp && sp.ovr != null) pool.push(sp);
    }
    if (pool.length < 11) return null;
    return bestEleven(pool, findFormation(11, "4-3-3"));
  }, [state, players]);

  const [reveal, setReveal] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setReveal(true), 250);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="screen champion champ-screen">
      <Confetti />
      <div className="champ-eyebrow">Fim da copa</div>

      <div className="champ-body">
        {/* ESQUERDA — card do campeão */}
        <div className={`champ-card ${reveal ? "in" : ""}`}>
          <span className="champ-trophy-big">🏆</span>
          <div className="champ-tag">Campeão</div>
          {champ && (
            <>
              <Avatar emoji={champ.emoji} color={champ.color} size={96} />
              <div className="champ-name">{champ.teamName}</div>
              <div className="champ-mgr">Técnico {champ.name}</div>
            </>
          )}
          {sevenNil && <div className="champ-pill">Fez 7 a 0! 🎉</div>}
          <div className="champ-stats">
            <div className="champ-stat">
              <span className="champ-stat-k">Final</span>
              <b className="champ-stat-v">{finalLabel}</b>
            </div>
            <div className="champ-stat">
              <span className="champ-stat-k">Aproveitamento</span>
              <b className="champ-stat-v">{rec.apr}%</b>
            </div>
          </div>
        </div>

        {/* DIREITA — artilharia + ações */}
        <div className="champ-right">
          {top && (
            <div className="topscorer">
              <span className="topscorer-badge">⚽</span>
              <div className="topscorer-info">
                <div className="topscorer-k">Artilheiro da copa</div>
                <div className="topscorer-name">{top.name}</div>
                <div className="topscorer-team">{topTeam?.teamName}</div>
              </div>
              <div className="topscorer-num"><b>{top.goals}</b><span>gols</span></div>
            </div>
          )}

          {scorers.length > 1 && (
            <>
              <div className="goleadores-label">Demais goleadores</div>
              <div className="goleadores">
                {scorers.slice(1, 5).map((s, i) => {
                  const tm = players.find((p) => p.id === s.teamId);
                  return (
                    <div className="goleador-row" key={s.id}>
                      <span className="goleador-rank">{i + 2}</span>
                      <span className="goleador-name">{s.name}</span>
                      <span className="goleador-team">{tm?.teamName}</span>
                      <span className="goleador-goals">{s.goals}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {standings.length > 1 && (
        <div className={`champ-bottom ${reveal ? "in" : ""}`}>
          <div className="champ-standings">
            <div className="champ-standings-title">Classificação final{isLeague ? " · pontos corridos" : " · mata-mata"}</div>

            {isLeague ? (
              <div className="table champ-table">
                <div className="table-head">
                  <span className="th-pos">#</span>
                  <span className="th-team">Time</span>
                  <span>P</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span>
                </div>
                {leagueRows.map((row, i) => {
                  const p = players.find((pl) => pl.id === row.id);
                  return (
                    <div key={row.id} className={`table-row ${row.id === t.champion ? "leader" : ""}`}>
                      <span className="th-pos">{i + 1}</span>
                      <span className="th-team">
                        <Avatar emoji={p?.emoji} color={p?.color} size={22} />
                        <span className="tr-name">{p?.teamName}</span>
                      </span>
                      <span className="tr-pts">{row.Pts}</span>
                      <span>{row.P}</span>
                      <span>{row.W}</span>
                      <span>{row.D}</span>
                      <span>{row.L}</span>
                      <span>{row.GD > 0 ? "+" + row.GD : row.GD}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="standings-list">
                {standings.map((row) => {
                  const p = players.find((pl) => pl.id === row.id);
                  return (
                    <div key={row.id} className={`standings-row ${row.id === t.champion ? "is-champ" : ""}`}>
                      <span className="standings-pos">{row.pos}º</span>
                      <Avatar emoji={p?.emoji} color={p?.color} size={28} />
                      <span className="standings-team">{p?.teamName}</span>
                      <span className="standings-detail">{row.detail}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {bestXI && (
            <div className="champ-bestxi">
              <div className="champ-standings-title">Seleção do campeonato · por nota</div>
              <BestXIPitch xi={bestXI} />
            </div>
          )}
        </div>
      )}

      <div className="champ-actions champ-actions-bottom">
        {isHost ? (
          <button className="btn btn-primary btn-lg" onClick={actions.playAgain}>Jogar novamente</button>
        ) : (
          <div className="waiting">Aguardando o anfitrião reiniciar…</div>
        )}
        <button className="btn btn-ghost btn-leave" onClick={actions.leave}>Sair da sala</button>
      </div>
    </div>
  );
}
