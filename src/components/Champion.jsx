import { useEffect, useState } from "react";
import { topScorers, allMatches } from "../engine/tournament.js";
import { Avatar } from "./bits.jsx";

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
  const finalLabel = fin
    ? `${fin.gf} — ${fin.ga}${fin.pens ? ` (${fin.pens})` : ""}`
    : `${rec.W}V ${rec.D}E ${rec.L}D`;

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

          <div className="champ-actions">
            {isHost ? (
              <button className="btn btn-primary btn-lg" onClick={actions.playAgain}>Jogar novamente</button>
            ) : (
              <div className="waiting">Aguardando o anfitrião reiniciar…</div>
            )}
            <button className="btn btn-ghost btn-leave" onClick={actions.leave}>Sair da sala</button>
          </div>
        </div>
      </div>
    </div>
  );
}
