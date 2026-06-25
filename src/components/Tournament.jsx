import {
  nextMatch,
  knockoutRoundLabels,
  leagueTable,
  roundLabel,
} from "../engine/tournament.js";
import { buildTeam } from "../engine/team.js";
import { Avatar, Eyebrow, ChalkLine, Crown } from "./bits.jsx";
import MatchView from "./MatchView.jsx";
import MatchLive from "./MatchLive.jsx";

function TeamLine({ player, goals, winner }) {
  return (
    <div className={`mc-team ${winner ? "win" : ""}`}>
      {player ? (
        <>
          <Avatar emoji={player.emoji} color={player.color} size={24} />
          <span className="mc-name">{player.teamName}</span>
        </>
      ) : (
        <span className="mc-name muted">A definir</span>
      )}
      {goals != null && <span className="mc-goals">{goals}</span>}
    </div>
  );
}

function MatchCard({ match, players, current }) {
  const home = players.find((p) => p.id === match.homeId);
  const away = players.find((p) => p.id === match.awayId);
  const r = match.result;

  if (match.isBye) {
    return (
      <div className="match-card bye">
        <div className="mc-team win">
          {home && <Avatar emoji={home.emoji} color={home.color} size={24} />}
          <span className="mc-name">{home?.teamName}</span>
        </div>
        <div className="mc-bye-label">classificado direto</div>
      </div>
    );
  }

  const homeWin = r && r.winner === "home";
  const awayWin = r && r.winner === "away";
  return (
    <div className={`match-card ${current ? "current" : ""} ${match.played ? "played" : ""}`}>
      <TeamLine player={home} goals={r ? r.homeGoals : null} winner={homeWin} />
      <TeamLine player={away} goals={r ? r.awayGoals : null} winner={awayWin} />
      {r && r.pens && <div className="mc-pens">pên {r.pens.home}-{r.pens.away}</div>}
      {current && <span className="mc-badge">agora</span>}
    </div>
  );
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

  return (
    <div className="screen tournament">
      <Eyebrow accent>{t.format === "knockout" ? "Mata-mata" : "Pontos corridos"}</Eyebrow>
      <h1 className="screen-title">Copa em andamento</h1>

      {hostOffline && !isHost && (
        <div className="banner banner-warn">
          O anfitrião saiu.{" "}
          <button className="linkbtn" onClick={actions.claimHost}>Assumir o comando</button>
        </div>
      )}

      {t.format === "knockout" ? (
        <KnockoutView t={t} players={players} current={upcoming} />
      ) : (
        <LeagueView t={t} players={players} current={upcoming} />
      )}

      {isHost && upcoming && (
        <div className="sticky-actions">
          <button className="btn btn-primary btn-block btn-lg" onClick={() => actions.startLiveMatch(upcoming.id)}>
            ▶ Jogar partida 2D
          </button>
          <div className="btn-pair">
            <button className="btn btn-ghost" onClick={actions.simulateRound}>Simular rodada</button>
            <button className="btn btn-ghost" onClick={actions.simulateAll}>Simular tudo</button>
          </div>
        </div>
      )}
      {!isHost && upcoming && (
        <p className="hint center">O anfitrião comanda as simulações. A tela atualiza sozinha.</p>
      )}
    </div>
  );
}

function KnockoutView({ t, players, current }) {
  const labels = knockoutRoundLabels(t);
  return (
    <div className="bracket">
      {t.rounds.map((round, ri) => (
        <div className="bracket-col" key={ri}>
          <div className="bracket-round">{labels[ri]}</div>
          {round.map((m) => (
            <MatchCard key={m.id} match={m} players={players} current={current && current.id === m.id} />
          ))}
        </div>
      ))}
    </div>
  );
}

function LeagueView({ t, players, current }) {
  const table = leagueTable(t, players);
  const rounds = {};
  t.fixtures.forEach((f) => {
    (rounds[f.round] = rounds[f.round] || []).push(f);
  });

  return (
    <>
      <ChalkLine label="classificação" />
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

      <ChalkLine label="jogos" />
      <div className="fixtures">
        {Object.keys(rounds).map((rk) => (
          <div className="fix-round" key={rk}>
            <div className="fix-round-label">{Number(rk) + 1}ª rodada</div>
            {rounds[rk].map((m) => (
              <MatchCard key={m.id} match={m} players={players} current={current && current.id === m.id} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
