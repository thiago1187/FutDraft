import {
  nextMatch,
  knockoutRoundLabels,
  leagueTable,
  roundLabel,
  allMatches,
} from "../engine/tournament.js";
import { buildTeam } from "../engine/team.js";
import { teamRatings } from "../engine/match.js";
import { Avatar, Crown, Ovr, escudoImg } from "./bits.jsx";
import MatchView from "./MatchView.jsx";
import MatchLive from "./MatchLive.jsx";

// Rótulo curto p/ "FAVORITO": o ano da seleção, se houver; senão o nome do time.
function shortLabel(p) {
  if (!p) return "—";
  const yr = (p.teamName.match(/\b(19|20)\d{2}\b/) || [])[0];
  return yr || p.teamName;
}
function abbr(name = "") {
  const w = name.replace(/\s+FC$/i, "").trim().split(/\s+/);
  return ((w[0]?.[0] || "") + (w[1]?.[0] || "")).toUpperCase() || "?";
}
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

// Escudo grande (bandeira/iniciais) usado no painel "Próximo jogo".
function BigBadge({ player }) {
  const src = player && escudoImg(player.emoji);
  if (src) return <span className="np-badge flag"><img src={src} alt="" /></span>;
  return <span className="np-badge" style={{ background: player?.color || "#2a2722" }}>{abbr(player?.teamName)}</span>;
}

export default function Tournament({ state, myId, isHost, isLocal, room, actions, hostOffline, onLeave }) {
  const t = state.tournament;
  const players = state.players;

  // partida em apresentação
  if (state.presenting) {
    const all = t.format === "league" ? t.fixtures : t.rounds.flat();
    const m = all.find((x) => x.id === state.presenting.matchId);
    // Partida 2D AO VIVO (tela cheia)
    if (m && state.presenting.mode === "live") {
      return (
        <MatchLive
          key={m.id}
          match={{ id: m.id, knockout: t.format === "knockout" }}
          home={buildTeam(state, m.homeId)}
          away={buildTeam(state, m.awayId)}
          homeMgr={players.find((p) => p.id === m.homeId)}
          awayMgr={players.find((p) => p.id === m.awayId)}
          myId={myId}
          isHost={isHost}
          isLocal={isLocal}
          room={room}
          onFinish={(result) => actions.finishLiveMatch(m.id, result)}
          onLeave={onLeave}
        />
      );
    }
    // fallback animado (resultado pré-calculado)
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

  // contagem de jogos jogados / faltando (ignora byes no mata-mata)
  let played, faltam;
  if (isKnock) {
    const round0 = t.rounds[0];
    const S = round0.length * 2;
    const byeCount = round0.filter((m) => m.isBye).length;
    const totalReal = S - 1 - byeCount;
    played = allMatches(t).filter((m) => m.played && !m.isBye).length;
    faltam = Math.max(0, totalReal - played);
  } else {
    played = t.fixtures.filter((f) => f.played).length;
    faltam = t.fixtures.length - played;
  }

  // rótulo da fase atual (subtítulo + eyebrow do painel)
  let roundName = "";
  if (upcoming) {
    if (isKnock) {
      const ri = t.rounds.findIndex((r) => r.some((m) => m.id === upcoming.id));
      roundName = roundLabel(t.rounds[ri].length);
    } else {
      roundName = `${upcoming.round + 1}ª rodada`;
    }
  }

  // Overall de cada time (aparece já no início do torneio, logo após o draft).
  const ovrById = {};
  for (const p of players) ovrById[p.id] = teamOverall(state, p.id);

  return (
    <div className="screen tournament cup-screen">
      {/* CABEÇALHO */}
      <header className="cup-head">
        <div className="cup-head-l">
          <div className="eyebrow accent">{isKnock ? "Mata-mata" : "Pontos corridos"}</div>
          <h1 className="cup-title">Copa em andamento</h1>
          <div className="cup-sub">
            {roundName ? `${roundName} · ` : ""}{players.length} técnicos
            <span className="cup-sub-bar" />
          </div>
        </div>
        <div className="cup-head-r">
          <div className="cup-count"><b>{played}</b><span>jogos</span></div>
          <div className="cup-count-div" />
          <div className="cup-count"><b>{faltam}</b><span>faltam</span></div>
        </div>
      </header>

      {hostOffline && !isHost && (
        <div className="banner banner-warn">
          O anfitrião saiu.{" "}
          <button className="linkbtn" onClick={actions.claimHost}>Assumir o comando</button>
        </div>
      )}

      <div className="cup-body">
        <div className="cup-main">
          {isKnock ? (
            <KnockoutBracket t={t} players={players} current={upcoming} ovrById={ovrById} />
          ) : (
            <LeagueView t={t} players={players} current={upcoming} ovrById={ovrById} />
          )}
        </div>

        {upcoming && (
          <aside className="cup-aside">
            <NextPanel
              state={state}
              match={upcoming}
              players={players}
              roundName={roundName}
              isHost={isHost}
              actions={actions}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------- PAINEL "PRÓXIMO JOGO" ----------
function NextPanel({ state, match, players, roundName, isHost, actions }) {
  const home = players.find((p) => p.id === match.homeId);
  const away = players.find((p) => p.id === match.awayId);
  const hOvr = teamOverall(state, match.homeId);
  const aOvr = teamOverall(state, match.awayId);
  const maxOvr = Math.max(hOvr ?? 0, aOvr ?? 0);
  const fav = hOvr == null || aOvr == null ? null : hOvr === aOvr ? null : hOvr > aOvr ? home : away;

  return (
    <div className="next-panel">
      <div className="next-eyebrow">Próximo jogo{roundName ? ` · ${roundName}` : ""}</div>

      <div className="next-teams">
        <div className="next-team">
          <BigBadge player={home} />
          <div className="next-team-name">{home?.teamName}</div>
        </div>
        <div className="next-vs">VS</div>
        <div className="next-team">
          <BigBadge player={away} />
          <div className="next-team-name">{away?.teamName}</div>
        </div>
      </div>

      <div className="next-stats">
        <div className="next-stat">
          <span className="next-stat-k">Força</span>
          <b className="next-stat-v">{maxOvr || "—"} <i>geral</i></b>
        </div>
        <div className="next-stat">
          <span className="next-stat-k">Favorito</span>
          <b className="next-stat-v">{fav ? shortLabel(fav) : "Equilíbrio"}</b>
        </div>
      </div>

      {isHost ? (
        <div className="next-actions">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => actions.startLiveMatch(match.id)}>
            ▶ Jogar partida 2D
          </button>
          <div className="btn-pair">
            <button className="btn btn-dark" onClick={() => actions.simulateNext?.()}>Simular partida</button>
            <button className="btn btn-dark" onClick={actions.simulateRound}>Simular rodada</button>
          </div>
          <button className="btn btn-dark btn-block" onClick={actions.simulateAll}>Simular tudo</button>
          <p className="next-note">O anfitrião comanda as simulações. A tela de todos atualiza sozinha.</p>
        </div>
      ) : (
        <p className="next-note solo">O anfitrião comanda as simulações. A tela de todos atualiza sozinha.</p>
      )}
    </div>
  );
}

// ---------- CHAVEAMENTO (mata-mata) com fases futuras projetadas ----------
function KnockoutBracket({ t, players, current, ovrById }) {
  const round0 = t.rounds[0];
  const total = Math.round(Math.log2(round0.length * 2)); // nº de fases (até a final)
  const currentId = current?.id;

  // monta colunas: fases reais + fases futuras (placeholders), pré-preenchendo
  // vencedores já decididos.
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

  const labels = [];
  for (let ri = 0; ri < total; ri++) labels.push(roundLabel(round0.length / Math.pow(2, ri)));

  const champ = players.find((p) => p.id === t.champion);

  return (
    <div className="bracket">
      {cols.map((slots, ri) => (
        <div className="bracket-col" key={ri}>
          <div className="bracket-round">{labels[ri]}</div>
          {slots.map((s, j) => (
            <BracketSlot key={j} slot={s} players={players} ovrById={ovrById} feeder={ri > 0 ? labels[ri - 1] : null} />
          ))}
        </div>
      ))}

      {/* coluna do campeão */}
      <div className="bracket-col champ-col">
        <div className="bracket-round">Campeão</div>
        <div className={`champ-slot ${champ ? "decided" : ""}`}>
          <span className="champ-trophy">🏆</span>
          {champ ? (
            <>
              <Avatar emoji={champ.emoji} color={champ.color} size={26} />
              <span className="champ-slot-name">{champ.teamName}</span>
            </>
          ) : (
            <span className="champ-slot-name muted">a definir</span>
          )}
        </div>
      </div>
    </div>
  );
}

function BracketSlot({ slot, players, ovrById, feeder }) {
  const home = players.find((p) => p.id === slot.homeId);
  const away = players.find((p) => p.id === slot.awayId);
  const r = slot.match?.result;
  const placeholder = feeder ? `vencedor · ${feeder.replace(/ de final$/i, "")}` : "a definir";

  if (slot.match?.isBye) {
    return (
      <div className="match-card bye">
        <div className="mc-team win">
          {home && <Avatar emoji={home.emoji} color={home.color} size={22} />}
          <span className="mc-name">{home?.teamName}</span>
        </div>
        <div className="mc-bye-label">classificado direto</div>
      </div>
    );
  }

  const homeWin = r && r.winner === "home";
  const awayWin = r && r.winner === "away";
  return (
    <div className={`match-card ${slot.current ? "current" : ""} ${slot.match?.played ? "played" : ""}`}>
      <SlotTeam player={home} placeholder={placeholder} ovr={home && ovrById?.[home.id]} goals={r ? r.homeGoals : null} win={homeWin} />
      <SlotTeam player={away} placeholder={placeholder} ovr={away && ovrById?.[away.id]} goals={r ? r.awayGoals : null} win={awayWin} />
      {r && r.pens && <div className="mc-pens">pênaltis {r.pens.home} — {r.pens.away}</div>}
      {slot.current && <span className="mc-badge">agora</span>}
    </div>
  );
}

function SlotTeam({ player, placeholder, ovr, goals, win }) {
  return (
    <div className={`mc-team ${win ? "win" : ""}`}>
      {player ? (
        <>
          <Avatar emoji={player.emoji} color={player.color} size={22} />
          <span className="mc-name">{player.teamName}</span>
          {ovr != null && <Ovr value={ovr} />}
        </>
      ) : (
        <span className="mc-name muted ph">{placeholder}</span>
      )}
      {goals != null && <span className="mc-goals">{goals}</span>}
    </div>
  );
}

// ---------- PONTOS CORRIDOS ----------
function LeagueView({ t, players, current, ovrById }) {
  const table = leagueTable(t, players);
  const rounds = {};
  t.fixtures.forEach((f) => {
    (rounds[f.round] = rounds[f.round] || []).push(f);
  });

  return (
    <div className="league-wrap">
      <div className="league-tablecard">
        <div className="table">
          <div className="table-head">
            <span className="th-pos">#</span>
            <span className="th-team">Time</span>
            <span>P</span>
            <span>J</span>
            <span>V</span>
            <span>E</span>
            <span>D</span>
            <span>SG</span>
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
              return (
                <div className={`match-card ${current && current.id === m.id ? "current" : ""} ${m.played ? "played" : ""}`} key={m.id}>
                  <SlotTeam player={home} ovr={home && ovrById?.[home.id]} goals={r ? r.homeGoals : null} win={r && r.winner === "home"} />
                  <SlotTeam player={away} ovr={away && ovrById?.[away.id]} goals={r ? r.awayGoals : null} win={r && r.winner === "away"} />
                  {current && current.id === m.id && <span className="mc-badge">agora</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
