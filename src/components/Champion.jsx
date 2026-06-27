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

// Boneco do pódio (SVG) — camisa na cor do time; campeão ergue a taça, medalhistas com medalha.
function PodiumFigure({ color, variant }) {
  if (variant === "champ") {
    return (
      <div className="pf-champ">
        <div className="pf-trophy"><span className="pf-trophy-raise"><span className="pf-trophy-float">🏆</span></span></div>
        <svg width="96" height="132" viewBox="0 0 84 120" fill="none">
          <ellipse cx="35" cy="114" rx="9" ry="5.5" fill="#1C1A17" /><ellipse cx="49" cy="114" rx="9" ry="5.5" fill="#1C1A17" />
          <rect x="31" y="84" width="9.5" height="29" rx="4.7" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" /><rect x="43.5" y="84" width="9.5" height="29" rx="4.7" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
          <path d="M25 70 h34 v8 q0 8 -8 8 h-5 v-6 h-3 v6 h-5 q-8 0 -8 -8 z" fill="#1B2A5B" stroke="#2A2218" strokeWidth="1.4" />
          <path d="M31 46 L41 11" stroke="#2A2218" strokeWidth="12.5" strokeLinecap="round" /><path d="M57 46 L47 11" stroke="#2A2218" strokeWidth="12.5" strokeLinecap="round" />
          <path d="M31 46 L41 11" stroke={color} strokeWidth="9.5" strokeLinecap="round" /><path d="M57 46 L47 11" stroke={color} strokeWidth="9.5" strokeLinecap="round" />
          <circle cx="41" cy="10" r="5.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" /><circle cx="47" cy="10" r="5.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
          <rect x="24" y="40" width="40" height="44" rx="13" fill={color} stroke="#2A2218" strokeWidth="1.4" />
          <rect x="38" y="33" width="12" height="9" fill="#E8B894" stroke="#2A2218" strokeWidth="1.2" />
          <circle cx="44" cy="23" r="12.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
          <path d="M32 23 A12 12 0 0 1 56 23 C50 14, 38 14, 32 23 Z" fill="#3A2A1C" />
          <circle cx="40" cy="24" r="1.5" fill="#2A2218" /><circle cx="48" cy="24" r="1.5" fill="#2A2218" />
          <path d="M40 28 Q44 31 48 28" stroke="#2A2218" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </svg>
      </div>
    );
  }
  const m = variant === "silver"
    ? { ribbon: "#5E6B86", disc: "#D8DCE3", ring: "#9097A1" }
    : { ribbon: "#8A6A4A", disc: "#DCA471", ring: "#A06C3A" };
  return (
    <svg className="pf-medal" width="78" height="120" viewBox="0 0 80 120" fill="none">
      <ellipse cx="34" cy="114" rx="8.5" ry="5" fill="#1C1A17" /><ellipse cx="46" cy="114" rx="8.5" ry="5" fill="#1C1A17" />
      <rect x="30" y="84" width="9" height="28" rx="4.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" /><rect x="41" y="84" width="9" height="28" rx="4.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
      <path d="M24 70 h32 v8 q0 8 -8 8 h-4 v-6 h-4 v6 h-4 q-8 0 -8 -8 z" fill="#1E3FA0" stroke="#2A2218" strokeWidth="1.4" />
      <rect x="14" y="42" width="9" height="32" rx="4.5" fill={color} stroke="#2A2218" strokeWidth="1.4" /><circle cx="18.5" cy="77" r="5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
      <rect x="57" y="42" width="9" height="32" rx="4.5" fill={color} stroke="#2A2218" strokeWidth="1.4" /><circle cx="61.5" cy="77" r="5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
      <rect x="22" y="38" width="36" height="40" rx="12" fill={color} stroke="#2A2218" strokeWidth="1.4" />
      <rect x="35" y="31" width="10" height="9" fill="#E8B894" stroke="#2A2218" strokeWidth="1.2" />
      <circle cx="40" cy="21" r="12.5" fill="#E8B894" stroke="#2A2218" strokeWidth="1.4" />
      <path d="M28 21 A12 12 0 0 1 52 21 C46 12, 34 12, 28 21 Z" fill="#3A2A1C" />
      <circle cx="36" cy="22" r="1.4" fill="#2A2218" /><circle cx="44" cy="22" r="1.4" fill="#2A2218" />
      <path d="M36 26 Q40 29 44 26" stroke="#2A2218" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M33 39 L40 58" stroke={m.ribbon} strokeWidth="3.2" /><path d="M47 39 L40 58" stroke={m.ribbon} strokeWidth="3.2" />
      <circle cx="40" cy="62" r="7.5" fill={m.disc} stroke={m.ring} strokeWidth="1.6" /><circle cx="37.5" cy="59.5" r="2.5" fill="#fff" opacity="0.6" />
    </svg>
  );
}

function PodiumPlace({ place, player, label, rec }) {
  if (!player) return <div className={`podium-col p${place} empty`} />;
  const step = place === 1 ? "gold" : place === 2 ? "silver" : "bronze";
  const variant = place === 1 ? "champ" : place === 2 ? "silver" : "bronze";
  return (
    <div className={`podium-col p${place}`}>
      <div className="pc-head">
        <div className={`pc-label ${step}`}>{label}</div>
        <div className="pc-team">
          <Avatar emoji={player.emoji} color={player.color} size={place === 1 ? 28 : 23} />
          <span className="pc-name">{player.teamName}</span>
        </div>
        <div className="pc-mgr">Téc. {player.name}</div>
        {place === 1 && rec && (
          <div className="pc-chips">
            <div className="pc-chip"><span>Final</span><b>{rec.W}V {rec.D}E {rec.L}D</b></div>
            <div className="pc-chip"><span>Aproveitamento</span><b>{rec.apr}%</b></div>
          </div>
        )}
      </div>
      <div className="pc-figure"><PodiumFigure color={player.color || "#888"} variant={variant} /></div>
      <div className={`pc-step ${step}`}><span className="pc-stepnum">{place}</span><span className="pc-shine" /></div>
    </div>
  );
}

function Podium({ standings, players, rec, isLeague }) {
  const get = (pos) => {
    const row = standings.find((s) => s.pos === pos);
    return row ? players.find((p) => p.id === row.id) : null;
  };
  const third = get(3);
  return (
    <div className="podium-hero">
      <Confetti />
      <div className="ph-glow" aria-hidden />
      <div className="ph-eyebrow">
        <span className="ph-brand">Fim da Copa</span>
        <span className="ph-season">Copa dos Amigos</span>
      </div>
      <div className="podium">
        <PodiumPlace place={2} player={get(2)} label="Vice-campeão" />
        <PodiumPlace place={1} player={get(1)} label="Campeão" rec={rec} />
        <PodiumPlace place={3} player={third} label={isLeague ? "3º lugar" : "Semifinalista"} />
      </div>
    </div>
  );
}

export default function Champion({ state, isHost, actions }) {
  const t = state.tournament;
  const players = state.players;
  const scorers = topScorers(t);
  const top = scorers[0];
  const topTeam = top && players.find((p) => p.id === top.teamId);
  const rec = champRecord(t, t.champion);
  const isLeague = t.format === "league" || (t.fixtures && !t.rounds);
  const fmtTag = isLeague ? "pontos corridos" : t.format === "cup" ? "copa" : "mata-mata";
  const standings = finalStandings(t, players);

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
    <div className="screen champion tchamp">
      <Podium standings={standings} players={players} rec={rec} isLeague={isLeague} />

      <div className={`tchamp-grid ${reveal ? "in" : ""}`}>
        {/* esquerda — classificação final */}
        <div className="tchamp-col">
          <div className="tchamp-sechead">
            <h2 className="tchamp-h2">Classificação Final</h2>
            <span className="tchamp-tag">{fmtTag}</span>
          </div>
          <div className="cstand">
            {standings.map((row) => {
              const p = players.find((pl) => pl.id === row.id);
              const isChamp = row.pos === 1;
              const isVice = row.pos === 2;
              return (
                <div className={`cstand-row ${isChamp ? "champ" : isVice ? "vice" : ""}`} key={row.id}>
                  <span className="cstand-pos">{row.pos}º</span>
                  <Avatar emoji={p?.emoji} color={p?.color} size={24} />
                  <span className="cstand-name">{p?.teamName || "—"}</span>
                  <span className="cstand-phase">{row.detail}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* direita — artilheiro + goleadores + seleção */}
        <div className="tchamp-col">
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

          {bestXI && (
            <>
              <div className="tchamp-sechead spaced">
                <h2 className="tchamp-h2">Seleção do Campeonato</h2>
                <span className="tchamp-tag">por nota</span>
              </div>
              <BestXIPitch xi={bestXI} />
            </>
          )}
        </div>
      </div>

      <div className="tchamp-actions">
        {isHost ? (
          <button className="btn btn-primary tchamp-again" onClick={actions.playAgain}>Jogar Novamente</button>
        ) : (
          <div className="waiting">Aguardando o anfitrião reiniciar…</div>
        )}
        <button className="btn tchamp-leave" onClick={actions.leave}>Sair da Sala</button>
      </div>
    </div>
  );
}
