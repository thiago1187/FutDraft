import { escudoImg } from "./bits.jsx";
import AddFriendButton from "./AddFriendButton.jsx";

// Pós-jogo (§7): súmula completa + corrida de xG + história por templates + notas e craque.
// Recebe `summary` (motor) e mostra tudo o que saiu do MESMO fluxo de eventos.

function Badge({ mgr, color }) {
  const src = mgr && escudoImg(mgr.emoji);
  if (src) return <span className="pm-badge flag"><img src={src} alt="" /></span>;
  return <span className="pm-badge" style={{ background: color }} />;
}

// Caminho em escada da corrida de xG.
function xgPath(timeline, key, W, H, maxXg) {
  if (!timeline?.length) return `M0 ${H}`;
  const x = (m) => (Math.min(m, 90) / 90) * W;
  const y = (v) => H - (v / maxXg) * H;
  let d = `M0 ${y(0)}`, prev = 0;
  for (const pt of timeline) { d += ` L${x(pt.m)} ${y(prev)} L${x(pt.m)} ${y(pt[key])}`; prev = pt[key]; }
  return d + ` L${W} ${y(prev)}`;
}

function Row({ label, h, a, hc, ac, bar }) {
  const tot = (Number(h) || 0) + (Number(a) || 0) || 1;
  return (
    <div className="pm-row">
      <span className="pm-row-h" style={{ color: hc }}>{h}</span>
      {bar ? (
        <span className="pm-row-bar">
          <i style={{ width: `${(Number(h) / tot) * 100}%`, background: hc }} />
          <i style={{ width: `${(Number(a) / tot) * 100}%`, background: ac }} />
        </span>
      ) : (
        <span className="pm-row-label">{label}</span>
      )}
      <span className="pm-row-a" style={{ color: ac }}>{a}</span>
      {bar && <span className="pm-row-blabel">{label}</span>}
    </div>
  );
}

function NotesCol({ title, color, players }) {
  const sorted = [...players].sort((a, b) => b.note - a.note);
  return (
    <div className="pm-notes-col">
      <div className="pm-notes-title" style={{ color }}>{title}</div>
      {sorted.map((p) => (
        <div key={p.id} className="pm-note-row">
          <span className="pm-note-pos">{p.pos}</span>
          <span className="pm-note-name">{p.name}</span>
          <span className="pm-note-tags">
            {p.goals > 0 && <span className="pm-tag goal">⚽{p.goals > 1 ? p.goals : ""}</span>}
            {p.yellow > 0 && <span className="pm-tag yel" />}
            {p.out && <span className="pm-tag red" />}
          </span>
          <span className={`pm-note-val ${p.note >= 7.5 ? "hi" : p.note < 5 ? "lo" : ""}`}>{p.note.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

export default function PostMatch({ summary, homeMgr, awayMgr, myId, canFinish, onContinue, onLeave }) {
  // adversário humano (pra oferecer adicionar como amigo no fim do jogo)
  const opp = [homeMgr, awayMgr].find((m) => m && !m.isBot && m.id !== myId);
  const s = summary;
  const hc = s.colors?.home || homeMgr?.color || "#E94E27";
  const ac = s.colors?.away || awayMgr?.color || "#2B5BA8";
  const hN = homeMgr?.teamName || s.names?.home || "Casa";
  const aN = awayMgr?.teamName || s.names?.away || "Fora";

  const W = 320, H = 110;
  const maxXg = Math.max(1, s.xg[0], s.xg[1], ...(s.xgTimeline || []).flatMap((p) => [p.h, p.a]));

  return (
    <div className="pm-overlay">
      <div className="pm-card">
        {/* CABEÇALHO */}
        <div className="pm-eyebrow">Fim de jogo</div>
        <div className="pm-head">
          <div className="pm-team l"><Badge mgr={homeMgr} color={hc} /><span className="pm-team-name">{hN}</span></div>
          <div className="pm-score">
            <span className="pm-score-nums"><b style={{ color: hc }}>{s.score[0]}</b><i>—</i><b style={{ color: ac }}>{s.score[1]}</b></span>
            {s.pens && <div className="pm-pens">pênaltis {s.pens.home}–{s.pens.away}</div>}
          </div>
          <div className="pm-team r"><span className="pm-team-name">{aN}</span><Badge mgr={awayMgr} color={ac} /></div>
        </div>

        {/* HISTÓRIA */}
        <div className="pm-story">{s.story}</div>

        {/* CRAQUE */}
        {s.mvp && (
          <div className="pm-mvp">
            <span className="pm-mvp-star">★</span>
            <span className="pm-mvp-label">Craque da partida</span>
            <span className="pm-mvp-name">{s.mvp.name}</span>
            <span className="pm-mvp-team" style={{ color: s.mvp.side === "home" ? hc : ac }}>{s.mvp.team}</span>
            <span className="pm-mvp-note">{s.mvp.note.toFixed(1)}</span>
          </div>
        )}

        <div className="pm-body">
          {/* CORRIDA DE xG */}
          <div className="pm-xg">
            <div className="pm-section-title">Corrida de xG <span className="pm-xg-vals"><b style={{ color: hc }}>{s.xg[0].toFixed(1)}</b> — <b style={{ color: ac }}>{s.xg[1].toFixed(1)}</b></span></div>
            <svg className="pm-xg-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <line x1="0" y1={H} x2={W} y2={H} className="pm-xg-axis" />
              <path d={xgPath(s.xgTimeline, "h", W, H, maxXg)} fill="none" stroke={hc} strokeWidth="2.5" />
              <path d={xgPath(s.xgTimeline, "a", W, H, maxXg)} fill="none" stroke={ac} strokeWidth="2.5" />
            </svg>
            <div className="pm-xg-foot"><span>0'</span><span>45'</span><span>90'</span></div>
          </div>

          {/* SÚMULA */}
          <div className="pm-stats">
            <div className="pm-section-title">Súmula</div>
            <Row label="Posse de bola" h={`${s.possession[0]}%`} a={`${s.possession[1]}%`} hc={hc} ac={ac} bar />
            <Row label="Finalizações" h={s.shots[0]} a={s.shots[1]} hc={hc} ac={ac} bar />
            <Row label="No alvo" h={s.onTarget[0]} a={s.onTarget[1]} hc={hc} ac={ac} bar />
            <Row label="xG" h={s.xg[0].toFixed(1)} a={s.xg[1].toFixed(1)} hc={hc} ac={ac} bar />
            <Row label="Escanteios" h={s.corners[0]} a={s.corners[1]} hc={hc} ac={ac} bar />
            <Row label="Faltas" h={s.fouls[0]} a={s.fouls[1]} hc={hc} ac={ac} bar />
            <Row label="Amarelos" h={s.yellows[0]} a={s.yellows[1]} hc={hc} ac={ac} bar />
            <Row label="Vermelhos" h={s.reds[0]} a={s.reds[1]} hc={hc} ac={ac} bar />
          </div>
        </div>

        {/* NOTAS */}
        <div className="pm-notes">
          <NotesCol title={hN} color={hc} players={s.notes.home} />
          <NotesCol title={aN} color={ac} players={s.notes.away} />
        </div>

        {/* AÇÕES */}
        <div className="pm-actions">
          {opp && (
            <AddFriendButton myId={myId} targetId={opp.id} targetName={opp.teamName} className="pm-add-friend" />
          )}
          {canFinish ? (
            <button className="btn btn-primary btn-block btn-lg" onClick={onContinue}>Continuar →</button>
          ) : (
            <div className="pm-wait">Aguardando o anfitrião avançar…</div>
          )}
          {onLeave && <button className="btn btn-ghost btn-block" onClick={onLeave}>Sair pro Lobby</button>}
        </div>
      </div>
    </div>
  );
}
