import { useEffect, useState } from "react";
import { Avatar } from "./bits.jsx";

const DURATION = 7000; // ms para "rodar" os 90 minutos

export default function MatchView({ match, players, isHost, onContinue }) {
  const home = players.find((p) => p.id === match.homeId);
  const away = players.find((p) => p.id === match.awayId);
  const result = match.result || { homeGoals: 0, awayGoals: 0, events: [], pens: null };
  const goals = (result.events || []).filter((e) => e.type === "goal");

  const [minute, setMinute] = useState(0);
  const [score, setScore] = useState([0, 0]);
  const [feed, setFeed] = useState([]);
  const [done, setDone] = useState(false);
  const [showPens, setShowPens] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // sem animação: mostra direto o placar final
      setMinute(90);
      setScore([result.homeGoals, result.awayGoals]);
      setFeed(goals.map((g) => ({ ...g })));
      setShowPens(!!result.pens);
      setDone(true);
      return;
    }

    const start = performance.now();
    let shown = 0;
    const id = setInterval(() => {
      const t = Math.min(1, (performance.now() - start) / DURATION);
      const min = Math.round(t * 90);
      setMinute(min);
      while (shown < goals.length && goals[shown].minute <= min) {
        const g = goals[shown];
        setScore([g.score[0], g.score[1]]);
        setFeed((f) => [{ ...g }, ...f]);
        shown++;
      }
      if (t >= 1) {
        clearInterval(id);
        setScore([result.homeGoals, result.awayGoals]);
        if (result.pens) setShowPens(true);
        setDone(true);
      }
    }, 1000 / 30);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const phase = minute === 0 ? "Início" : minute >= 90 ? "Fim de jogo" : minute === 45 ? "Intervalo" : `${minute}'`;

  return (
    <div className="matchview">
      <div className="match-phase">{done ? "Fim de jogo" : phase}</div>

      <div className="scoreboard">
        <div className="sb-team">
          <Avatar emoji={home?.emoji} color={home?.color} size={52} />
          <div className="sb-name">{home?.teamName}</div>
        </div>
        <div className="sb-score">
          <span className="sb-num">{score[0]}</span>
          <span className="sb-x">×</span>
          <span className="sb-num">{score[1]}</span>
        </div>
        <div className="sb-team">
          <Avatar emoji={away?.emoji} color={away?.color} size={52} />
          <div className="sb-name">{away?.teamName}</div>
        </div>
      </div>

      {showPens && result.pens && (
        <div className="pens">
          <span className="pens-label">Pênaltis</span>
          <span className="pens-score">
            {result.pens.home} × {result.pens.away}
          </span>
        </div>
      )}

      <div className="commentary">
        {feed.length === 0 && !done && <div className="comm-line muted">Bola rolando…</div>}
        {feed.map((g, i) => (
          <div key={i} className={`comm-line goal ${g.side}`}>
            <span className="comm-min">{g.minute}'</span>
            <span className="comm-icon">⚽</span>
            <span className="comm-text">
              <strong>GOL</strong> — {g.scorer} ({g.side === "home" ? home?.teamName : away?.teamName})
            </span>
          </div>
        ))}
        {done && goals.length === 0 && <div className="comm-line muted">Sem gols na partida.</div>}
      </div>

      {done && (
        isHost ? (
          <button className="btn btn-primary btn-block btn-lg" onClick={onContinue}>
            Continuar →
          </button>
        ) : (
          <div className="waiting">Aguardando o anfitrião continuar…</div>
        )
      )}
    </div>
  );
}
