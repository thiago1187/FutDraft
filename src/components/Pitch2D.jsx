// Campo 2D estilo "futebol de botões" — discos numerados + bola.
// Recebe o estado do motor liveMatch (tokens + bola). Posições em 0..100.

export default function Pitch2D({ tokens, ball, homeColor, awayColor, lastEvent, homeName, awayName }) {
  return (
    <div className="pitch2d">
      {/* linhas do campo */}
      <div className="p2-line-mid" />
      <div className="p2-circle" />
      <div className="p2-spot" />
      <div className="p2-box p2-box-l" />
      <div className="p2-box p2-box-r" />
      <div className="p2-area p2-area-l" />
      <div className="p2-area p2-area-r" />

      {/* jogadores */}
      {tokens.home.map((t) => (
        <Disc key={"h" + t.id} t={t} color={t.pos === "GK" ? "#C7A24A" : homeColor} ink={t.pos === "GK"} />
      ))}
      {tokens.away.map((t) => (
        <Disc key={"a" + t.id} t={t} color={t.pos === "GK" ? "#1C1A17" : awayColor} ink={false} />
      ))}

      {/* bola */}
      <div className="p2-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />

      {/* lower-third do último lance */}
      {lastEvent && (
        <div className="p2-lower">
          {lastEvent.type === "goal" && <span className="p2-tag gol">⚽ GOL</span>}
          {lastEvent.type === "save" && <span className="p2-tag save">DEFESA</span>}
          {lastEvent.type === "corner" && <span className="p2-tag">ESCANTEIO</span>}
          {lastEvent.type === "whistle" && <span className="p2-tag">🔔</span>}
          {lastEvent.type === "sub" && <span className="p2-tag sub">⇄</span>}
          <span className="p2-comm">{commentary(lastEvent, homeName, awayName)}</span>
        </div>
      )}
    </div>
  );
}

function Disc({ t, color, ink }) {
  return (
    <div
      className="p2-disc"
      style={{
        left: `${t.x}%`,
        top: `${t.y}%`,
        background: color,
        color: ink ? "#1C1A17" : "#fff",
      }}
      title={t.name}
    >
      {t.num}
    </div>
  );
}

function commentary(ev, homeName, awayName) {
  const team = ev.side === "home" ? homeName : awayName;
  switch (ev.type) {
    case "goal":
      return `${ev.minute}' ${ev.scorer} marca para o ${team}!`;
    case "save":
      return `${ev.minute}' Defesaça do goleiro!`;
    case "shot":
      return `${ev.minute}' Finalizou para fora.`;
    case "corner":
      return `${ev.minute}' Escanteio para o ${team}.`;
    case "sub":
      return `${ev.minute}' Sai ${ev.outName}, entra ${ev.inName}.`;
    case "whistle":
      return ev.text || "";
    default:
      return `${ev.minute}'`;
  }
}
