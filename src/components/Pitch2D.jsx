// Campo 2D — discos + bola, com portador destacado, trajetória de chute, goleiro
// mergulhando, rede do gol e expulsos. Lê tokens/ball/cinematic do motor liveMatch.

export default function Pitch2D({ tokens, ball, homeColor, awayColor, cinematic, carrier, homeName, awayName }) {
  const cine = cinematic && (cinematic.type === "shot" || cinematic.type === "penalty") ? cinematic : null;
  const defSide = cine ? (cine.side === "home" ? "away" : "home") : null;
  const goalBulge = cinematic && cinematic.type === "shot" && cinematic.outcome === "goal" ? cinematic.side : null;

  // trajetória da bola no chute
  let shot = null;
  if (cine) {
    const goalX = cine.side === "home" ? 98 : 2;
    let ex = goalX, ey = clamp(cine.aimY ?? 50, 8, 92);
    if (cine.outcome === "wide" || cine.outcome === "over") { ex = cine.side === "home" ? 103 : -3; ey = (cine.aimY ?? 50) < 50 ? 22 : 78; }
    else if (cine.outcome === "save") { ex = cine.side === "home" ? 93 : 7; }
    shot = { fx: cine.fromX ?? ball.x, fy: cine.fromY ?? ball.y, ex, ey, id: cine.id, dur: cine.type === "penalty" ? 0.6 : 0.42 };
  }

  return (
    <div className="pitch2d">
      <div className="p2-line-mid" />
      <div className="p2-circle" />
      <div className="p2-spot" />
      <div className="p2-box p2-box-l" />
      <div className="p2-box p2-box-r" />
      <div className="p2-area p2-area-l" />
      <div className="p2-area p2-area-r" />
      {/* redes */}
      <div className={`p2-net p2-net-l ${goalBulge === "away" ? "bulge" : ""}`} key={"nl" + (goalBulge === "away" ? cinematic.id : 0)} />
      <div className={`p2-net p2-net-r ${goalBulge === "home" ? "bulge" : ""}`} key={"nr" + (goalBulge === "home" ? cinematic.id : 0)} />

      {/* jogadores */}
      {tokens.home.filter((t) => !t.out).map((t) => (
        <Disc key={"h" + t.id} t={t} color={t.pos === "GK" ? "#C7A24A" : homeColor} ink={t.pos === "GK"}
          carrier={carrier?.side === "home" && tokens.home[carrier.idx]?.id === t.id}
          dive={defSide === "home" && t.pos === "GK" ? cine : null} />
      ))}
      {tokens.away.filter((t) => !t.out).map((t) => (
        <Disc key={"a" + t.id} t={t} color={t.pos === "GK" ? "#1C1A17" : awayColor} ink={false}
          carrier={carrier?.side === "away" && tokens.away[carrier.idx]?.id === t.id}
          dive={defSide === "away" && t.pos === "GK" ? cine : null} />
      ))}

      {/* bola */}
      {shot ? (
        <div key={"shot" + shot.id} className="p2-ball shooting"
          style={{ "--fx": `${shot.fx}%`, "--fy": `${shot.fy}%`, "--ex": `${shot.ex}%`, "--ey": `${shot.ey}%`, "--dur": `${shot.dur}s` }} />
      ) : (
        <div key="ball" className="p2-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
      )}
    </div>
  );
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function Disc({ t, color, ink, carrier, dive }) {
  let style = { left: `${t.x}%`, top: `${t.y}%`, background: color, color: ink ? "#1C1A17" : "#fff" };
  let cls = "p2-disc";
  if (carrier) cls += " carrier";
  if (dive) {
    cls += " dive";
    style = { ...style, "--dx": `${(dive.gkDir || 1) * 24}px`, "--rot": `${(dive.gkDir || 1) * 32}deg` };
  }
  const tired = t.stamina != null && t.stamina < 50;
  return (
    <div className={cls + (tired ? " tired" : "")} style={style} title={t.name}>
      {t.num}
      {carrier && <span className="p2-carrier-ring" />}
    </div>
  );
}
