import { useEffect, useState } from "react";
import { topScorers } from "../engine/tournament.js";
import { Avatar, Eyebrow } from "./bits.jsx";

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
  const champ = state.players.find((p) => p.id === t.champion);
  const scorers = topScorers(t);
  const top = scorers[0];
  const topTeam = top && state.players.find((p) => p.id === top.teamId);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setReveal(true), 250);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="screen champion">
      <Confetti />
      <Eyebrow accent>Fim da copa</Eyebrow>

      <div className={`trophy-wrap ${reveal ? "in" : ""}`}>
        <div className="trophy">🏆</div>
        <div className="champion-label">Campeão</div>
        {champ && (
          <div className="champion-team">
            <Avatar emoji={champ.emoji} color={champ.color} size={72} />
            <div className="champion-name">{champ.teamName}</div>
            <div className="champion-mgr">Técnico {champ.name}</div>
          </div>
        )}
      </div>

      {top && (
        <div className="card award">
          <span className="award-icon">⚽</span>
          <div className="award-info">
            <div className="award-title">Artilheiro</div>
            <div className="award-name">
              {top.name} <span className="muted">· {topTeam?.teamName}</span>
            </div>
          </div>
          <div className="award-num">{top.goals}</div>
        </div>
      )}

      {scorers.length > 1 && (
        <div className="scorer-list">
          {scorers.slice(1, 5).map((s) => {
            const tm = state.players.find((p) => p.id === s.teamId);
            return (
              <div className="scorer-row" key={s.id}>
                <span>{s.name}</span>
                <span className="muted">{tm?.teamName}</span>
                <span className="scorer-goals">{s.goals}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="sticky-actions">
        {isHost ? (
          <button className="btn btn-primary btn-block btn-lg" onClick={actions.playAgain}>
            Jogar novamente
          </button>
        ) : (
          <div className="waiting">Aguardando o anfitrião reiniciar…</div>
        )}
        <button className="btn btn-ghost btn-block" onClick={actions.leave}>Sair da sala</button>
      </div>
    </div>
  );
}
