import { useLayoutEffect, useRef } from "react";
import {
  nextMatch,
  leagueTable,
  groupTable,
  roundLabel,
  allMatches,
} from "../engine/tournament.js";
import { buildTeam } from "../engine/team.js";
import { teamRatings } from "../engine/match.js";
import { Avatar, Crown, Ovr } from "./bits.jsx";
import MatchView from "./MatchView.jsx";
import MatchLive from "./MatchLive.jsx";

function teamOverall(state, id) {
  if (!id) return null;
  try {
    return Math.round(teamRatings(buildTeam(state, id).squad).overall);
  } catch {
    return null;
  }
}
function winnerOf(m) {
  if (!m || !m.result) return null;
  return m.result.winner === "home" ? m.homeId : m.awayId;
}
// Nome curto da fase pelo nº de jogos da rodada.
function shortRound(size) {
  return size === 1 ? "Final" : size === 2 ? "Semi" : size === 4 ? "Quartas" : size === 8 ? "Oitavas" : `Fase de ${size * 2}`;
}

// Lista de fases do campeonato para o rail (done / now / todo).
function computePhases(t) {
  if (t.format === "league") return [];
  const out = [];
  const ph = (label, sub, state) => ({ label, sub, state });
  if (t.format === "cup") {
    const gg = t.groups.reduce((s, g) => s + g.fixtures.length, 0);
    const inGroups = t.phase === "groups";
    out.push(ph("Grupos", `${gg} jogos`, inGroups ? "now" : "done"));
    let size = t.groups.length, ri = 0;
    while (size >= 1) {
      let state = "todo";
      if (!inGroups) {
        const round = t.rounds[ri];
        state = !round ? "todo" : round.every((m) => m.played) ? "done" : "now";
      }
      out.push(ph(shortRound(size), `${size} jogo${size > 1 ? "s" : ""}`, state));
      if (size === 1) break;
      size /= 2; ri++;
    }
    return out;
  }
  // mata-mata
  let size = t.rounds[0].length, ri = 0;
  while (size >= 1) {
    const round = t.rounds[ri];
    const state = !round ? "todo" : round.every((m) => m.played) ? "done" : "now";
    out.push(ph(shortRound(size), `${size} jogo${size > 1 ? "s" : ""}`, state));
    if (size === 1) break;
    size /= 2; ri++;
  }
  return out;
}

export default function Tournament({ state, myId, isHost, isLocal, room, actions, hostOffline, onLeave }) {
  const t = state.tournament;
  const players = state.players;

  // mata-mata "de verdade", ou fase eliminatória da copa → empates vão a pênaltis
  const knockoutNow = t.format === "knockout" || (t.format === "cup" && t.phase === "knockout");

  // partida em apresentação
  if (state.presenting) {
    const m = allMatches(t).find((x) => x.id === state.presenting.matchId);
    if (m && state.presenting.mode === "live") {
      return (
        <MatchLive
          key={m.id}
          match={{ id: m.id, knockout: knockoutNow }}
          home={buildTeam(state, m.homeId)}
          away={buildTeam(state, m.awayId)}
          homeMgr={players.find((p) => p.id === m.homeId)}
          awayMgr={players.find((p) => p.id === m.awayId)}
          myId={myId}
          isHost={isHost}
          isLocal={isLocal}
          room={room}
          tournament={t}
          players={players}
          onFinish={(result) => actions.finishLiveMatch(m.id, result)}
          onLeave={onLeave}
        />
      );
    }
    if (m && m.result) {
      return (
        <div className="screen tournament">
          <MatchView key={m.id} match={m} players={players} isHost={isHost} onContinue={actions.continueAfterMatch} />
        </div>
      );
    }
  }

  const upcoming = nextMatch(t);
  const isKnock = t.format === "knockout";
  const isCup = t.format === "cup";
  const isLeague = t.format === "league";

  // contagem de jogos jogados (ignora byes)
  let played;
  if (isCup) played = allMatches(t).filter((m) => m.played && !m.isBye).length;
  else if (isKnock) played = allMatches(t).filter((m) => m.played && !m.isBye).length;
  else played = t.fixtures.filter((f) => f.played).length;

  // rótulo da rodada atual (barra de próximo jogo)
  let roundName = "";
  if (upcoming) {
    if (isCup) {
      roundName = t.phase === "groups" ? "Fase de grupos" : (() => {
        const ri = t.rounds.findIndex((r) => r.some((m) => m.id === upcoming.id));
        return ri >= 0 ? roundLabel(t.rounds[ri].length) : "Mata-mata";
      })();
    } else if (isKnock) {
      const ri = t.rounds.findIndex((r) => r.some((m) => m.id === upcoming.id));
      roundName = ri >= 0 ? roundLabel(t.rounds[ri].length) : "Mata-mata";
    } else {
      roundName = `${upcoming.round + 1}ª rodada`;
    }
  }

  const phases = computePhases(t);
  const curPhase = phases.find((p) => p.state === "now");
  const faseAtual = curPhase ? curPhase.label : upcoming ? "—" : "Fim";

  const ovrById = {};
  for (const p of players) ovrById[p.id] = teamOverall(state, p.id);

  const showBracket = isKnock || (isCup && t.phase === "knockout");

  return (
    <div className="screen tournament tcup">
      {/* eyebrow */}
      <div className="tcup-eyebrow">
        <span className="tcup-brand">FutDraft · Copa dos Amigos</span>
        {upcoming && <span className="tcup-live"><i className="tcup-live-dot" />Próximo jogo a seguir</span>}
      </div>

      {/* headline */}
      <div className="tcup-headline">
        <div>
          <div className="tcup-kicker">{isCup ? "Copa · grupos + mata-mata" : isKnock ? "Mata-mata" : "Pontos corridos"}</div>
          <h1 className="tcup-title">Copa em Andamento</h1>
        </div>
        <div className="tcup-stats">
          <div className="tcup-stat"><b>{players.length}</b><span>Técnicos</span></div>
          <div className="tcup-stat-div" />
          <div className="tcup-stat"><b>{played}</b><span>Jogos</span></div>
          <div className="tcup-stat-div" />
          <div className="tcup-stat"><b className="red">{faseAtual}</b><span>Fase atual</span></div>
        </div>
      </div>

      {phases.length > 0 && <PhaseRail phases={phases} />}

      {hostOffline && !isHost && (
        <div className="banner banner-warn">
          O anfitrião saiu. <button className="linkbtn" onClick={actions.claimHost}>Assumir o comando</button>
        </div>
      )}

      {upcoming && (
        <NextBar state={state} match={upcoming} players={players} roundName={roundName} isHost={isHost} actions={actions} />
      )}

      {isCup && <GroupsSection t={t} players={players} current={upcoming} />}

      {showBracket && <BracketSection t={t} players={players} current={upcoming} ovrById={ovrById} isCup={isCup} />}

      {isCup && t.phase === "groups" && (
        <p className="tcup-hint">O mata-mata é montado quando a fase de grupos terminar — os 2 primeiros de cada grupo avançam.</p>
      )}

      {isLeague && <LeagueView t={t} players={players} current={upcoming} ovrById={ovrById} />}
    </div>
  );
}

// ---------- RAIL DE FASES ----------
function PhaseRail({ phases }) {
  return (
    <div className="tcup-rail">
      {phases.map((p, i) => (
        <div className="trail-step" key={i}>
          <div className="trail-cell">
            <div className={`trail-node ${p.state}`}>{p.state === "done" ? "✓" : p.state === "now" ? "●" : "—"}</div>
            <div>
              <div className={`trail-label ${p.state}`}>{p.label}</div>
              <div className="trail-sub">{p.sub}</div>
            </div>
          </div>
          {i < phases.length - 1 && <div className={`trail-line ${p.state === "done" ? "done" : ""}`} />}
        </div>
      ))}
    </div>
  );
}

// ---------- BARRA "PRÓXIMO JOGO" (controles) ----------
function NextBar({ state, match, players, roundName, isHost, actions }) {
  const home = players.find((p) => p.id === match.homeId);
  const away = players.find((p) => p.id === match.awayId);
  return (
    <div className="tcup-nextbar">
      <div className="tnb-info">
        <span className="tnb-eyebrow">A seguir{roundName ? ` · ${roundName}` : ""}</span>
        <span className="tnb-teams">
          <Avatar emoji={home?.emoji} color={home?.color} size={24} />
          <b>{home?.teamName}</b>
          <i className="tnb-vs">×</i>
          <b>{away?.teamName}</b>
          <Avatar emoji={away?.emoji} color={away?.color} size={24} />
        </span>
      </div>
      {isHost ? (
        <div className="tnb-actions">
          <button className="btn btn-primary" onClick={() => actions.startLiveMatch(match.id)}>▶ Jogar 2D</button>
          <button className="btn btn-dark" onClick={() => actions.simulateNext?.()}>Simular jogo</button>
          <button className="btn btn-dark" onClick={actions.simulateRound}>Simular fase</button>
          <button className="btn btn-dark" onClick={actions.simulateAll}>Simular tudo</button>
        </div>
      ) : (
        <span className="tnb-note">O anfitrião comanda as simulações — a tela atualiza sozinha.</span>
      )}
    </div>
  );
}

// ---------- FASE DE GRUPOS ----------
function GroupsSection({ t, players, current }) {
  const closed = t.phase === "knockout";
  return (
    <section className="tcup-section">
      <div className="tcup-sechead">
        <h2 className="tcup-h2">Fase de Grupos</h2>
        <span className="tcup-sectag">{closed ? "encerrada" : "em andamento"} · 2 avançam por grupo</span>
        <div className="tcup-rule" />
        <span className="tcup-legend"><i className="tcup-legend-sq" />Classificado</span>
      </div>
      <div className="tcup-groups">
        {t.groups.map((g) => (
          <GroupCardWC key={g.name} group={g} players={players} current={current} />
        ))}
      </div>
    </section>
  );
}

function GroupCardWC({ group, players, current }) {
  const table = groupTable(group);
  const someCurrent = group.fixtures.some((f) => current && f.id === current.id);
  return (
    <div className={`gcard ${someCurrent ? "active" : ""}`}>
      <div className="gcard-head">
        <span className="gcard-title">GRUPO {group.name}</span>
        <span className="gcard-pts">PTS</span>
      </div>
      {table.map((row, i) => {
        const p = players.find((pl) => pl.id === row.id);
        const q = i < 2;
        return (
          <div className={`gcard-row ${q ? "q" : ""}`} key={row.id}>
            <span className="gcard-rank">{i + 1}</span>
            <span className="gcard-crest"><Avatar emoji={p?.emoji} color={p?.color} size={20} /></span>
            <span className="gcard-name">{p?.teamName || "—"}</span>
            <span className="gcard-sg">{row.GD > 0 ? "+" + row.GD : row.GD}</span>
            <span className="gcard-ptsv">{row.Pts}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------- MATA-MATA (bracket Copa do Mundo + linhas conectoras) ----------
function drawConnectors(root, svg, connections) {
  if (!root || !svg) return;
  const rect = root.getBoundingClientRect();
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const SVGNS = "http://www.w3.org/2000/svg";
  const node = (id) => root.querySelector(`[data-mid="${id}"]`);
  for (const [target, sources] of connections) {
    const tEl = node(target);
    if (!tEl) continue;
    const tr = tEl.getBoundingClientRect();
    if (tr.width === 0) continue;
    for (const sid of sources) {
      const sEl = node(sid);
      if (!sEl) continue;
      const sr = sEl.getBoundingClientRect();
      if (sr.width === 0) continue;
      const leftFlow = (sr.left + sr.right) / 2 < (tr.left + tr.right) / 2;
      const sx = (leftFlow ? sr.right : sr.left) - rect.left;
      const sy = (sr.top + sr.bottom) / 2 - rect.top;
      const tx = (leftFlow ? tr.left : tr.right) - rect.left;
      const ty = (tr.top + tr.bottom) / 2 - rect.top;
      const midX = (sx + tx) / 2;
      const p = document.createElementNS(SVGNS, "path");
      p.setAttribute("d", `M${sx},${sy} H${midX} V${ty} H${tx}`);
      p.setAttribute("fill", "none");
      p.setAttribute("stroke", target === "F" ? "#c7a24a" : "#cdbc83");
      p.setAttribute("stroke-width", target === "F" ? "2" : "1.5");
      p.setAttribute("stroke-linejoin", "round");
      svg.appendChild(p);
    }
  }
}

function BracketSection({ t, players, current, ovrById, isCup }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);

  const round0 = t.rounds[0];
  const total = Math.round(Math.log2(round0.length * 2));
  const currentId = current?.id;

  const cols = [];
  for (let ri = 0; ri < total; ri++) {
    const count = round0.length / Math.pow(2, ri);
    const real = t.rounds[ri];
    const slots = [];
    for (let j = 0; j < count; j++) {
      if (real && real[j]) {
        const m = real[j];
        slots.push({ match: m, homeId: m.homeId, awayId: m.awayId, winnerId: winnerOf(m), current: currentId === m.id });
      } else {
        const prev = cols[ri - 1] || [];
        slots.push({ match: null, homeId: prev[2 * j]?.winnerId ?? null, awayId: prev[2 * j + 1]?.winnerId ?? null, winnerId: null, current: false });
      }
    }
    cols.push(slots);
  }
  const finalSlot = cols[total - 1]?.[0];
  const sideRounds = total - 1;
  const leftCols = [], rightCols = [];
  for (let ri = 0; ri < sideRounds; ri++) {
    const half = Math.ceil(cols[ri].length / 2);
    leftCols.push(cols[ri].slice(0, half));
    rightCols.push(cols[ri].slice(half));
  }

  const connections = [];
  for (let ri = 1; ri < sideRounds; ri++) {
    leftCols[ri].forEach((_, j) => connections.push([`L${ri}_${j}`, [`L${ri - 1}_${2 * j}`, `L${ri - 1}_${2 * j + 1}`]]));
    rightCols[ri].forEach((_, j) => connections.push([`R${ri}_${j}`, [`R${ri - 1}_${2 * j}`, `R${ri - 1}_${2 * j + 1}`]]));
  }
  if (sideRounds > 0) connections.push(["F", [`L${sideRounds - 1}_0`, `R${sideRounds - 1}_0`]]);

  useLayoutEffect(() => {
    const root = wrapRef.current, svg = svgRef.current;
    const draw = () => drawConnectors(root, svg, connections);
    draw();
    const timers = [60, 220, 500].map((d) => setTimeout(draw, d));
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    let ro;
    if (window.ResizeObserver && root) { ro = new ResizeObserver(draw); ro.observe(root); }
    return () => { timers.forEach(clearTimeout); window.removeEventListener("resize", onResize); ro && ro.disconnect(); };
  });

  const labels = [];
  for (let ri = 0; ri < total; ri++) labels.push(shortRound(round0.length / Math.pow(2, ri)).toUpperCase());

  return (
    <section className="tcup-section">
      <div className="tcup-sechead">
        <h2 className="tcup-h2">Mata-Mata</h2>
        <span className="tcup-sectag">{isCup ? "classificados dos grupos" : "chave eliminatória"}</span>
        <div className="tcup-rule" />
      </div>

      <div className="bwc" ref={wrapRef}>
        <svg className="bwc-svg" ref={svgRef} />

        {leftCols.map((slots, ri) => (
          <div className="bwc-col" key={"L" + ri}>
            <div className="bwc-cap">{labels[ri]}</div>
            <div className="bwc-cells">
              {slots.map((s, j) => (
                <div className="bwc-cell" data-mid={`L${ri}_${j}`} key={j}>
                  <MatchCard slot={s} players={players} ovrById={ovrById} feeder={ri > 0 ? labels[ri - 1] : null} />
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bwc-col bwc-center">
          <div className="bwc-cap final">🏆 FINAL</div>
          <div className="bwc-cells">
            <div className="bwc-cell" data-mid="F">
              <FinalCard slot={finalSlot} players={players} />
            </div>
          </div>
        </div>

        {Array.from({ length: sideRounds }).map((_, idx) => {
          const ri = sideRounds - 1 - idx;
          return (
            <div className="bwc-col" key={"R" + ri}>
              <div className="bwc-cap">{labels[ri]}</div>
              <div className="bwc-cells">
                {rightCols[ri].map((s, j) => (
                  <div className="bwc-cell" data-mid={`R${ri}_${j}`} key={j}>
                    <MatchCard slot={s} players={players} ovrById={ovrById} feeder={ri > 0 ? labels[ri - 1] : null} mirror />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Card de jogo do bracket — estados: done (placar), live (a seguir, escuro), pending (tracejado).
function MatchCard({ slot, players, ovrById, feeder, mirror }) {
  const home = players.find((p) => p.id === slot.homeId);
  const away = players.find((p) => p.id === slot.awayId);
  const r = slot.match?.result;
  const status = slot.match?.played ? "done" : slot.current ? "live" : "pending";
  const ph = feeder ? `Vencedor · ${feeder}` : "A definir";

  if (status === "pending") {
    return (
      <div className={`mwc pending ${mirror ? "mirror" : ""}`}>
        <div className="mwc-row"><span className="mwc-crest dash" /><span className="mwc-name ph">{home?.teamName || ph}</span></div>
        <div className="mwc-sep" />
        <div className="mwc-row"><span className="mwc-crest dash" /><span className="mwc-name ph">{away?.teamName || ph}</span></div>
      </div>
    );
  }

  if (status === "live") {
    return (
      <div className={`mwc live ${mirror ? "mirror" : ""}`}>
        <div className="mwc-livehead"><span className="mwc-agora"><i className="mwc-livedot" />A seguir</span></div>
        <div className="mwc-row">
          <Avatar emoji={home?.emoji} color={home?.color} size={22} />
          <span className="mwc-name">{home?.teamName || "—"}</span>
          {ovrById?.[home?.id] != null && <span className="mwc-ovr">{ovrById[home.id]}</span>}
        </div>
        <div className="mwc-row">
          <Avatar emoji={away?.emoji} color={away?.color} size={22} />
          <span className="mwc-name">{away?.teamName || "—"}</span>
          {ovrById?.[away?.id] != null && <span className="mwc-ovr">{ovrById[away.id]}</span>}
        </div>
      </div>
    );
  }

  const homeWin = r && r.winner === "home";
  const awayWin = r && r.winner === "away";
  return (
    <div className={`mwc done ${mirror ? "mirror" : ""}`}>
      <div className={`mwc-row ${homeWin ? "win" : "lose"}`}>
        <Avatar emoji={home?.emoji} color={home?.color} size={22} />
        <span className="mwc-name">{home?.teamName || "—"}</span>
        <span className="mwc-score">{r ? r.homeGoals : ""}</span>
      </div>
      <div className="mwc-sep" />
      <div className={`mwc-row ${awayWin ? "win" : "lose"}`}>
        <Avatar emoji={away?.emoji} color={away?.color} size={22} />
        <span className="mwc-name">{away?.teamName || "—"}</span>
        <span className="mwc-score">{r ? r.awayGoals : ""}</span>
      </div>
      {r && r.pens && <div className="mwc-pens">pên {r.pens.home}-{r.pens.away}</div>}
    </div>
  );
}

// Card da final (destaque dourado).
function FinalCard({ slot, players }) {
  const home = slot && players.find((p) => p.id === slot.homeId);
  const away = slot && players.find((p) => p.id === slot.awayId);
  const r = slot?.match?.result;
  const champSide = r ? r.winner : null;
  const Row = ({ p, side }) => (
    <div className={`mwc-row ${r ? (champSide === side ? "win" : "lose") : ""}`}>
      {p ? <Avatar emoji={p.emoji} color={p.color} size={26} /> : <span className="mwc-crest dash big" />}
      <span className={`mwc-name ${p ? "" : "ph"}`}>
        {p ? p.teamName : "Vencedor · Semifinal"}
        {r && champSide === side && <span className="mwc-champ"> 🏆</span>}
      </span>
      {r ? <span className="mwc-score">{side === "home" ? r.homeGoals : r.awayGoals}</span> : p ? <span className="mwc-finalist">finalista</span> : null}
    </div>
  );
  return (
    <div className="mwc final">
      <Row p={home} side="home" />
      <div className="mwc-sep" />
      <Row p={away} side="away" />
      {r && r.pens && <div className="mwc-pens gold">pên {r.pens.home}-{r.pens.away}</div>}
    </div>
  );
}

// ---------- PONTOS CORRIDOS ----------
function LeagueView({ t, players, current, ovrById }) {
  const table = leagueTable(t, players);
  const rounds = {};
  t.fixtures.forEach((f) => { (rounds[f.round] = rounds[f.round] || []).push(f); });

  return (
    <div className="league-wrap">
      <div className="league-tablecard">
        <div className="table">
          <div className="table-head">
            <span className="th-pos">#</span>
            <span className="th-team">Time</span>
            <span>P</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span>
          </div>
          {table.map((row, i) => {
            const p = players.find((pl) => pl.id === row.id);
            return (
              <div className={`table-row ${i === 0 ? "leader" : ""}`} key={row.id}>
                <span className="th-pos">{i + 1}</span>
                <span className="th-team">
                  <Avatar emoji={p?.emoji} color={p?.color} size={22} />
                  <span className="tr-name">{p?.teamName}</span>
                  {ovrById?.[row.id] != null && <Ovr value={ovrById[row.id]} />}
                  {i === 0 && row.P > 0 && <Crown />}
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
      </div>

      <div className="fixtures">
        {Object.keys(rounds).map((rk) => (
          <div className="fix-round" key={rk}>
            <div className="fix-round-label">{Number(rk) + 1}ª rodada</div>
            {rounds[rk].map((m) => {
              const home = players.find((p) => p.id === m.homeId);
              const away = players.find((p) => p.id === m.awayId);
              const r = m.result;
              const cur = current && current.id === m.id;
              return (
                <div className={`mwc lg ${m.played ? "done" : cur ? "live" : "pending"}`} key={m.id}>
                  <div className={`mwc-row ${r && r.winner === "home" ? "win" : r ? "lose" : ""}`}>
                    <Avatar emoji={home?.emoji} color={home?.color} size={20} />
                    <span className="mwc-name">{home?.teamName}</span>
                    <span className="mwc-score">{r ? r.homeGoals : cur ? "▶" : ""}</span>
                  </div>
                  <div className={`mwc-row ${r && r.winner === "away" ? "win" : r ? "lose" : ""}`}>
                    <Avatar emoji={away?.emoji} color={away?.color} size={20} />
                    <span className="mwc-name">{away?.teamName}</span>
                    <span className="mwc-score">{r ? r.awayGoals : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
