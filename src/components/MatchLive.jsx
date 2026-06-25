import { useEffect, useRef, useState } from "react";
import { createLiveMatch } from "../engine/liveMatch.js";
import { teamRatings } from "../engine/match.js";
import { escudoImg } from "./bits.jsx";
import Pitch2D from "./Pitch2D.jsx";

const SPEEDS = [1, 2, 4];

function badge(name = "") {
  const w = name.replace(/\s+FC$/i, "").trim().split(/\s+/);
  return ((w[0]?.[0] || "") + (w[1]?.[0] || w[0]?.[1] || "")).toUpperCase();
}
// Escudo do time no placar: bandeira (imagem) se for seleção — resolve fl:/fls:/emoji.
// Cai no emoji só se for de fato um emoji visível; senão mostra as iniciais coloridas
// (nunca o texto cru de um código tipo "fls:http..." ou "URS").
function TeamBadge({ mgr, name, color }) {
  const src = mgr && escudoImg(mgr.emoji);
  if (src) return <span className="mlf-badge flag"><img src={src} alt="" /></span>;
  const em = mgr?.emoji;
  if (em && !/^fls?:/.test(em) && !/^[A-Za-z]{2,4}$/.test(em)) {
    return <span className="mlf-badge" style={{ background: color }}>{em}</span>;
  }
  return <span className="mlf-badge" style={{ background: color }}>{badge(name)}</span>;
}
function capital(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function lastName(name = "") {
  const p = name.split(" ");
  return p.length > 1 ? p[p.length - 1] : p[0];
}

export default function MatchLive({ match, home, away, homeMgr, awayMgr, myId, isHost, isLocal, room, onFinish, onLeave, forcePens }) {
  const controller = isHost;
  const engineRef = useRef(null);
  const rafRef = useRef(0);
  const lastTs = useRef(0);
  const lastSnap = useRef(0);
  const finishedRef = useRef(false);
  const pensStartedRef = useRef(false);
  const penResultRef = useRef(null);
  const speedRef = useRef(1);

  const homeColor = homeMgr?.color || "#E94E27";
  const awayColor = awayMgr?.color || "#2B5BA8";
  const colorOf = (s) => (s === "home" ? homeColor : awayColor);

  // Lados que ESTE aparelho pode comandar (nunca os de CPU/adversário online).
  function ownedSideOrNull() {
    if (homeMgr?.id === myId) return "home";
    if (awayMgr?.id === myId) return "away";
    return null;
  }
  const humanSides = ["home", "away"].filter((s) => !((s === "home" ? homeMgr : awayMgr)?.isBot));
  const controllable = isLocal ? humanSides : (ownedSideOrNull() ? [ownedSideOrNull()] : []);

  const [, setTick] = useState(0);
  const [snap, setSnap] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [ctrlSide, setCtrlSide] = useState(controllable[0] || "home");
  const [pens, setPens] = useState(null);

  const canControl = (side) => controllable.includes(side);
  const mySide = controllable.includes(ctrlSide) ? ctrlSide : (controllable[0] || "home");

  // Tema na cor do time SÓ quando há um único dono claro (eu sou o técnico de um lado).
  const themeColor = controllable.length === 1 ? colorOf(controllable[0]) : null;

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ---- CONTROLLER ----
  useEffect(() => {
    if (!controller) return;
    const eng = createLiveMatch(home, away, {
      knockout: match.knockout, homeColor, awayColor,
      cpu: { home: !!homeMgr?.isBot, away: !!awayMgr?.isBot },
    });
    engineRef.current = eng;
    if (forcePens) {
      eng.state.phase = "PEN";
      eng.state.minute = 90;
      pensStartedRef.current = true;
      startPens(eng);
    }
    const off = room?.onBroadcast?.((event, data) => {
      if (event === "cmd" && engineRef.current) applyCommand(data);
    });
    const loop = (ts) => {
      const dt = lastTs.current ? ts - lastTs.current : 16;
      lastTs.current = ts;
      const e = engineRef.current;
      if (e && !e.state.paused) e.step(Math.min(dt, 60), speedRef.current);
      if (room && ts - lastSnap.current > 200) {
        lastSnap.current = ts;
        room.broadcast("snap", compact(e.state));
      }
      if (e?.needsPens?.() && !pensStartedRef.current) {
        pensStartedRef.current = true;
        startPens(e);
      } else if (e?.isOver?.() && !finishedRef.current) {
        finalize(e.result());
      }
      setTick((n) => (n + 1) % 1000000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(rafRef.current); lastTs.current = 0; off && off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- SPECTATOR ----
  useEffect(() => {
    if (controller) return;
    const off = room?.onBroadcast?.((event, data) => {
      if (event === "snap") setSnap(data);
      if (event === "pens") setPens(data);
    });
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyCommand(cmd) {
    const e = engineRef.current;
    if (!e) return;
    if (cmd.kind === "tactic") e.setTactic(cmd.side, cmd.patch);
    if (cmd.kind === "ready") e.setReady(cmd.side);
    if (cmd.kind === "sub") {
      const bp = (cmd.side === "home" ? home.bench : away.bench).find((p) => p.id === cmd.inId);
      e.substitute(cmd.side, cmd.outId, bp);
    }
  }
  // Confirma todos os lados que ESTE aparelho controla (1 no online, os 2 no local).
  function readyUp() {
    const sides = isLocal ? ["home", "away"] : controllable;
    for (const s of sides) {
      if (controller) engineRef.current?.setReady(s);
      else room?.broadcast?.("cmd", { kind: "ready", side: s });
    }
    setTick((n) => n + 1);
  }
  // Válvula de segurança: o anfitrião força o 2º tempo mesmo se o adversário
  // não confirmar (caiu/ausente) — evita que a partida trave no intervalo.
  function forceSecondHalf() {
    engineRef.current?.setReady("home");
    engineRef.current?.setReady("away");
    setTick((n) => n + 1);
  }
  function sendCommand(cmd) {
    if (controller) applyCommand(cmd);
    else room?.broadcast?.("cmd", cmd);
  }
  function applyTactics(side, patch) {
    if (!canControl(side)) return;
    sendCommand({ kind: "tactic", side, patch });
    setTick((n) => n + 1);
  }
  function togglePause() {
    const e = engineRef.current;
    if (!e) return;
    setPaused(e.togglePause());
  }
  function startPens(e) {
    const sh = teamRatings(home.squad), sa = teamRatings(away.squad);
    const probH = Math.min(0.92, Math.max(0.55, 0.62 + (sh.overall - 70) / 120));
    const probA = Math.min(0.92, Math.max(0.55, 0.62 + (sa.overall - 70) / 120));
    setPens({ home: [], away: [], probH, probA, turn: "home", done: false, score: [0, 0] });
  }
  // Chute: o COBRADOR escolhe o canto; o goleiro (CPU) mergulha aleatório. Acertou = defesa, errou = gol.
  function kick(aim) {
    setPens((prev) => {
      if (!prev || prev.done || prev.animating) return prev;
      const p = structuredClone(prev);
      const side = p.turn;
      const dirs = ["cantoE", "meio", "cantoD"];
      const gkDir = dirs[Math.floor(Math.random() * dirs.length)];
      const scored = gkDir !== aim;
      p.lastKick = { aim, scored, gkDir, side, id: (prev.lastKick?.id || 0) + 1 };
      p.animating = true;
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  // Defesa: o GOLEIRO escolhe onde mergulhar; o cobrador (CPU) chuta aleatório.
  function defend(gkChoice) {
    setPens((prev) => {
      if (!prev || prev.done || prev.animating) return prev;
      const p = structuredClone(prev);
      const side = p.turn;
      const dirs = ["cantoE", "meio", "cantoD"];
      const aim = dirs[Math.floor(Math.random() * dirs.length)];
      const scored = gkChoice !== aim;
      p.lastKick = { aim, scored, gkDir: gkChoice, side, id: (prev.lastKick?.id || 0) + 1 };
      p.animating = true;
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  // Registra o resultado do lance; ao decidir, guarda o resultado (só finaliza no "Continuar").
  function commitKick() {
    setPens((prev) => {
      if (!prev || !prev.lastKick || !prev.animating) return prev;
      const p = structuredClone(prev);
      const { side, scored } = p.lastKick;
      p[side].push(scored);
      if (scored) p.score[side === "home" ? 0 : 1]++;
      p.turn = side === "home" ? "away" : "home";
      p.animating = false;
      if (isPenDecided(p.home, p.away, p.score)) {
        p.done = true;
        if (engineRef.current) penResultRef.current = engineRef.current.result({ home: p.score[0], away: p.score[1], order: [] });
      }
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  function finalize(result) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    if (room) room.broadcast("final", { matchId: match.id });
    onFinish(result);
  }

  const view = controller ? engineRef.current?.state : snap;
  if (!view) return <div className="ml-loading">Preparando a partida…</div>;

  const homeName = homeMgr?.teamName || home.name;
  const awayName = awayMgr?.teamName || away.name;
  const minute = view.minute;
  const phaseLabel = view.phase === "INT" ? "Intervalo" : view.phase === "FIM" ? "Fim de jogo" : view.phase === "PEN" ? "Pênaltis" : `${minute}'`;
  const tempo = minute < 45 ? "1º tempo" : "2º tempo";
  const sideColor = colorOf(mySide);
  const sideName = mySide === "home" ? homeName : awayName;
  const iAmManager = controllable.length > 0;
  const stats = view.stats || { possession: [1, 1], shots: [0, 0], onTarget: [0, 0], corners: [0, 0] };

  return (
    <div className={"matchlive-full" + (themeColor ? " themed" : "")} style={themeColor ? { "--team": themeColor } : undefined}>
      {/* TOP — placar transmissão */}
      <div className="mlf-top">
        <div className="mlf-team l">
          <TeamBadge mgr={homeMgr} name={homeName} color={homeColor} />
          <div><div className="mlf-team-name">{homeName}</div><div className="mlf-team-sub">{home.lineup?.formation?.name} · {capital(view.tactics?.home?.posture)}</div></div>
        </div>
        <div className="mlf-score">
          <div className="mlf-score-nums"><span>{view.score[0]}</span><i>—</i><span>{view.score[1]}</span></div>
          <div className="mlf-clock"><span className="ml-dot" /> {phaseLabel} · {tempo}</div>
        </div>
        <div className="mlf-team r">
          <div className="mlf-right"><div className="mlf-team-name">{awayName}</div><div className="mlf-team-sub">{away.lineup?.formation?.name} · {capital(view.tactics?.away?.posture)}</div></div>
          <TeamBadge mgr={awayMgr} name={awayName} color={awayColor} />
        </div>
      </div>

      {/* MAIN — 3 colunas */}
      <div className="mlf-main">
        {/* ESQUERDA — elenco (sem reservas) */}
        <aside className="mlf-left">
          {controllable.length > 1 && (
            <div className="mlf-sidesel">
              {controllable.map((s) => (
                <button key={s} className={`mlf-sidetab ${ctrlSide === s ? "sel" : ""}`} style={{ "--c": colorOf(s) }} onClick={() => setCtrlSide(s)}>
                  {s === "home" ? homeName : awayName}
                </button>
              ))}
            </div>
          )}
          <div className="mlf-label">{iAmManager ? "Seu elenco · energia" : `${sideName} · energia`}</div>
          <div className="mlf-squad">
            {view.tokens[mySide].map((t) => (
              <div key={t.id} className={`mlf-pl static ${t.out ? "expelled" : ""}`}>
                <span className="mlf-pl-num">{t.out ? "🟥" : t.num}</span>
                <span className="mlf-pl-body">
                  <span className="mlf-pl-name">{lastName(t.name)}</span>
                  <span className="mlf-energy"><i style={{ width: `${t.stamina ?? 100}%`, background: stamColor(t.stamina ?? 100) }} /></span>
                </span>
              </div>
            ))}
          </div>
        </aside>

        {/* CENTRO — campo */}
        <div className="mlf-center">
          <Pitch2D tokens={view.tokens} ball={view.ball} homeColor={homeColor} awayColor={awayColor}
            cinematic={view.cinematic} carrier={view.carrier} homeName={homeName} awayName={awayName} />
          <CineOverlay cine={view.cinematic} homeName={homeName} awayName={awayName} homeColor={homeColor} awayColor={awayColor} />
        </div>

        {/* DIREITA — tática ao vivo */}
        <aside className="mlf-right-panel">
          <div className="mlf-label team">Tática ao vivo — {sideName}</div>
          <TacticsLive side={mySide} tactics={view.tactics} locked={!canControl(mySide)} onApply={applyTactics} sideColor={sideColor} />
        </aside>
      </div>

      {/* STATS */}
      <div className="mlf-stats">
        <StatRow label="Posse" h={pct(stats.possession, 0)} a={pct(stats.possession, 1)} pctMode hc={homeColor} ac={awayColor} />
        <StatRow label="Finalizações" h={stats.shots[0]} a={stats.shots[1]} hc={homeColor} ac={awayColor} />
        <StatRow label="No alvo" h={stats.onTarget[0]} a={stats.onTarget[1]} hc={homeColor} ac={awayColor} />
        <StatRow label="Escanteios" h={stats.corners[0]} a={stats.corners[1]} hc={homeColor} ac={awayColor} />
      </div>

      {/* CONTROLES */}
      {controller ? (
        <div className="mlf-controls">
          <button className={`mlf-cbtn ${paused ? "resume" : ""}`} onClick={togglePause}>
            <span>{paused ? "▶" : "❚❚"}</span> {paused ? "Retomar jogo" : "Pausa técnica"}
          </button>
          <div className="mlf-spacer" />
          <span className="mlf-speed-label">Velocidade</span>
          <div className="mlf-speed">
            {SPEEDS.map((s) => <button key={s} className={`mlf-spd ${speed === s ? "sel" : ""}`} onClick={() => setSpeed(s)}>{s}×</button>)}
          </div>
        </div>
      ) : (
        <div className="ml-spectating">Assistindo ao vivo — o anfitrião comanda o relógio.</div>
      )}

      {/* INTERVALO — ambos prontos (com válvula de segurança do anfitrião) */}
      {view.phase === "INT" && (() => {
        const myUnready = controllable.filter((s) => !view.ready?.[s]);
        const bothReady = view.ready?.home && view.ready?.away;
        return (
          <div className="ml-halftime">
            <div className="ml-ht-card">
              <span className="pen-eyebrow">Intervalo</span>
              <div className="ml-ht-score">{homeName} <b>{view.score[0]}</b> — <b>{view.score[1]}</b> {awayName}</div>
              <p className="ml-ht-text">Ajuste sua tática (painel à direita) e confirme para começar o 2º tempo.</p>

              {controllable.length === 0 ? (
                <div className="waiting">Aguardando os técnicos confirmarem…</div>
              ) : myUnready.length > 0 ? (
                <button className="btn btn-primary btn-block btn-lg" onClick={readyUp}>
                  {isLocal ? "Começar 2º tempo →" : "Estou pronto →"}
                </button>
              ) : (
                <div className="waiting">✓ Pronto! Aguardando o adversário…</div>
              )}

              {/* Anfitrião pode destravar se o adversário não confirmar */}
              {controller && !isLocal && !bothReady && (
                <button className="btn btn-ghost btn-block ml-ht-force" onClick={forceSecondHalf}>
                  Começar 2º tempo agora (forçar) →
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {pens && (
        <Penalties
          pens={pens} homeName={homeName} awayName={awayName} homeColor={homeColor} awayColor={awayColor}
          canKick={controller} mySide={isLocal ? null : mySide} onKick={kick} onDefend={defend} onResolve={commitKick}
          isLocal={isLocal} canFinish={controller}
          onContinue={() => penResultRef.current && finalize(penResultRef.current)}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}

// Overlay cinematográfico central (GOOOL pulsando, defesaça, cartões, pênalti).
function CineOverlay({ cine, homeName, awayName, homeColor, awayColor }) {
  if (!cine) return null;
  const teamColor = cine.side === "home" ? homeColor : awayColor;
  const teamName = cine.side === "home" ? homeName : awayName;
  let big = null, sub = null, cls = "";
  if (cine.type === "shot") {
    if (cine.outcome === "goal") { big = "GOOOL!"; sub = `${cine.shooter} · ${teamName}`; cls = "goal"; }
    else if (cine.outcome === "save") { big = "DEFESAÇA!"; sub = "Que defesa!"; cls = "save"; }
    else if (cine.outcome === "post") { big = "NA TRAVE!"; cls = "post"; }
    else { big = "PRA FORA!"; cls = "miss"; }
  } else if (cine.type === "penalty") {
    big = cine.outcome === "goal" ? "GOL DE PÊNALTI!" : "PÊNALTI DEFENDIDO!";
    sub = cine.shooter; cls = cine.outcome === "goal" ? "goal" : "save";
  } else if (cine.type === "yellow") { big = "CARTÃO AMARELO"; sub = cine.name; cls = "yellow"; }
  else if (cine.type === "red") { big = "CARTÃO VERMELHO"; sub = cine.name; cls = "red"; }
  if (!big) return null;
  return (
    <div className={`ml-cine ${cls}`} key={cine.id} style={{ "--team": teamColor }}>
      <div className="ml-cine-big">{big}</div>
      {sub && <div className="ml-cine-sub">{sub}</div>}
    </div>
  );
}

function stamColor(s) {
  return s > 70 ? "#3f9c63" : s > 52 ? "#c7a24a" : "#e94e27";
}
function posShort(pos) {
  return pos === "GK" ? "GOL" : pos === "DEF" ? "ZAG" : pos === "MID" ? "MEI" : "ATA";
}
function pct(arr, i) {
  const tot = (arr[0] || 0) + (arr[1] || 0);
  return tot ? Math.round((arr[i] / tot) * 100) : 50;
}

function StatRow({ label, h, a, hc, ac, pctMode }) {
  const total = pctMode ? 100 : (h + a) || 1;
  const hw = pctMode ? h : (h / total) * 100;
  return (
    <div className="mlf-statrow">
      <span className="mlf-stat-h" style={{ color: hc }}>{pctMode ? `${h}%` : h}</span>
      <div className="mlf-stat-bar">
        <i style={{ width: `${hw}%`, background: hc }} />
        <i style={{ width: `${100 - hw}%`, background: ac }} />
      </div>
      <span className="mlf-stat-a" style={{ color: ac }}>{pctMode ? `${a}%` : a}</span>
      <span className="mlf-stat-label">{label}</span>
    </div>
  );
}

const POSTURES = [["defensivo", "Def"], ["equilibrado", "Eq"], ["ofensivo", "Ofen"]];
const LINES = [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]];
const MARKING = [["leve", "Leve"], ["pressao", "Pressão alta"]];

function TacticsLive({ side, tactics, locked, onApply, sideColor }) {
  const cur = tactics?.[side] || {};
  const [pending, setPending] = useState(cur);
  // ressincroniza quando troca de lado
  const sideRef = useRef(side);
  if (sideRef.current !== side) { sideRef.current = side; if (pending !== cur) setPending(cur); }

  const dirty = ["posture", "line", "build", "marking"].some((k) => pending[k] !== cur[k]);
  function set(k, v) { if (!locked) setPending((p) => ({ ...p, [k]: v })); }
  const build = pending.build ?? 0.4;

  return (
    <div className="mlf-tactics">
      <Seg label="Postura" options={POSTURES} value={pending.posture} onPick={(v) => set("posture", v)} />
      <Seg label="Linha defensiva" options={LINES} value={pending.line} onPick={(v) => set("line", v)} />
      <div className="mlf-seg-block">
        <div className="mlf-seg-label">Posse de bola</div>
        <div className="mlf-slider">
          <span className={build < 0.5 ? "on" : ""}>Toque</span>
          <input type="range" min="0" max="100" value={Math.round(build * 100)} disabled={locked}
            onChange={(e) => set("build", Number(e.target.value) / 100)} />
          <span className={build >= 0.5 ? "on" : ""}>Direto</span>
        </div>
      </div>
      <Seg label="Pressão" options={MARKING} value={pending.marking} onPick={(v) => set("marking", v)} />
      <button
        className="mlf-apply"
        disabled={locked || !dirty}
        style={{ background: dirty && !locked ? sideColor : undefined }}
        onClick={() => onApply(side, pending)}
      >
        {locked ? "Time do adversário" : dirty ? "Aplicar mudanças" : "Tática aplicada ✓"}
      </button>
    </div>
  );
}

function Seg({ label, options, value, onPick }) {
  return (
    <div className="mlf-seg-block">
      <div className="mlf-seg-label">{label}</div>
      <div className="mlf-seg">
        {options.map(([val, lbl]) => (
          <button key={val} className={`mlf-seg-item ${value === val ? "sel" : ""}`} onClick={() => onPick(val)}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

function compact(s) {
  const tk = (t) => ({ id: t.id, num: t.num, x: Math.round(t.x * 10) / 10, y: Math.round(t.y * 10) / 10, pos: t.pos, name: t.name, stamina: Math.round(t.stamina), out: t.out });
  return {
    minute: s.minute, phase: s.phase, score: s.score, ball: { x: Math.round(s.ball.x * 10) / 10, y: Math.round(s.ball.y * 10) / 10 },
    tokens: { home: s.tokens.home.map(tk), away: s.tokens.away.map(tk) },
    carrier: s.carrier, cinematic: s.cinematic, men: s.men, ready: s.ready,
    lastEvent: s.lastEvent, events: s.events.slice(-14), tactics: s.tactics, subsLeft: s.subsLeft, stats: s.stats,
  };
}

function isPenDecided(h, a, score) {
  const hd = h.length, ad = a.length;
  const remH = Math.max(0, 5 - hd), remA = Math.max(0, 5 - ad);
  if (hd <= 5 || ad <= 5) {
    if (score[0] > score[1] + remA) return true;
    if (score[1] > score[0] + remH) return true;
  }
  if (hd >= 5 && ad >= 5 && hd === ad && score[0] !== score[1]) return true;
  return false;
}

// Posição-alvo da bola por mira (% dentro do gol) e deslocamento do mergulho do goleiro.
const AIM_POS = { cantoE: { x: 20, y: 26 }, meio: { x: 50, y: 40 }, cantoD: { x: 80, y: 26 } };
const GK_SHIFT = { cantoE: -64, meio: 0, cantoD: 64 };

function Penalties({ pens, homeName, awayName, homeColor, awayColor, canKick, mySide, onKick, onDefend, onResolve, isLocal, canFinish, onContinue, onLeave }) {
  const lk = pens.lastKick;
  const [phase, setPhase] = useState("idle"); // idle | shoot | result

  // anima quando chega um novo lance; ao fim, registra (só o controlador)
  useEffect(() => {
    if (!pens.animating || !lk) { setPhase("idle"); return; }
    setPhase("shoot");
    const t1 = setTimeout(() => setPhase("result"), 850);
    const t2 = canKick ? setTimeout(() => onResolve(), 1250) : null;
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lk?.id, pens.animating]);

  const shooting = pens.turn;
  const shooterColor = shooting === "home" ? homeColor : awayColor;
  const target = lk ? AIM_POS[lk.aim] : AIM_POS.meio;
  const gkShift = lk ? GK_SHIFT[lk.gkDir] : 0;
  const animating = pens.animating && phase !== "idle";
  const showResult = phase === "result" && lk;

  // mySide=null → modo local (controla os dois). mySide definido → online:
  // se é a sua vez de cobrar você é o cobrador; senão você é o goleiro adversário.
  const isShooter = !mySide || pens.turn === mySide;
  const isGoalie = !!mySide && pens.turn !== mySide;
  const shootingTeamName = shooting === "home" ? homeName : awayName;
  const defendingTeamName = shooting === "home" ? awayName : homeName;

  const dots = (arr, n = 5) => {
    const out = [];
    for (let i = 0; i < Math.max(n, arr.length); i++) out.push(i < arr.length ? (arr[i] ? "scored" : "missed") : "pending");
    return out;
  };

  return (
    <div className="pen-overlay">
      <div className="pen-card">
        <span className="pen-eyebrow">Disputa de pênaltis</span>
        <div className="pen-score">
          <span className="pen-name">{homeName}</span>
          <span className="pen-nums"><b style={{ color: "#C7A24A" }}>{pens.score[0]}</b><i>—</i><b>{pens.score[1]}</b></span>
          <span className="pen-name">{awayName}</span>
        </div>

        {/* CENA ANIMADA */}
        <div className="pen-scene">
          <div className="pen-grass" />
          {/* gol */}
          <div className="pen-goalframe">
            <span className="pen-post l" /><span className="pen-post r" /><span className="pen-bar" />
            <span className="pen-mesh" />
          </div>
          {/* goleiro */}
          <div
            key={"gk" + (lk?.id || 0)}
            className={`pen-keeper ${animating ? "dive" : ""}`}
            style={{ "--gx": gkShift + "px", "--gr": (gkShift < 0 ? -22 : gkShift > 0 ? 22 : 0) + "deg" }}
          >
            <span className="pen-kp-arm la" /><span className="pen-kp-arm ra" />
            <span className="pen-kp-head" /><span className="pen-kp-body" />
          </div>
          {/* bola */}
          <div
            key={"ball" + (lk?.id || 0)}
            className={`pen-ball2 ${animating ? "shot" : ""}`}
            style={{ "--tx": target.x + "%", "--ty": target.y + "%" }}
          />
          {/* cobrador */}
          <div key={"kik" + (lk?.id || 0)} className={`pen-kicker ${animating ? "kick" : ""}`}>
            <span className="pen-kk-head" /><span className="pen-kk-body" style={{ background: shooterColor }} /><span className="pen-kk-leg" />
          </div>
          {/* etiqueta */}
          {showResult ? (
            <div className={`pen-flash ${lk.scored ? "goal" : "save"}`}>{lk.scored ? "GOL!" : "DEFENDEU!"}</div>
          ) : isGoalie ? (
            <div className="pen-shooting">Defender: <b style={{ color: shooting === "home" ? awayColor : homeColor }}>{defendingTeamName}</b></div>
          ) : (
            <div className="pen-shooting">Cobrando: <b>{shootingTeamName}</b></div>
          )}
        </div>

        <div className="pen-rows">
          <div className="pen-row"><span className="pen-tag" style={{ color: homeColor }}>{badge(homeName)}</span><div className="pen-dots">{dots(pens.home).map((d, i) => <span key={i} className={`pen-dot ${d}`} />)}</div></div>
          <div className="pen-row"><span className="pen-tag" style={{ color: awayColor }}>{badge(awayName)}</span><div className="pen-dots">{dots(pens.away).map((d, i) => <span key={i} className={`pen-dot ${d}`} />)}</div></div>
        </div>

        {!pens.done && canKick && !pens.animating && isShooter && (
          <div className="pen-aim">
            <div className="pen-aim-label">Escolha o canto para chutar</div>
            {[["cantoE", "↖ Canto"], ["meio", "↑ Meio"], ["cantoD", "↗ Canto"]].map(([k, l]) => (
              <button key={k} className="pen-aim-btn" onClick={() => onKick(k)}>{l}</button>
            ))}
          </div>
        )}
        {!pens.done && canKick && !pens.animating && isGoalie && (
          <div className="pen-aim pen-aim-defend">
            <div className="pen-aim-label">Escolha onde mergulhar</div>
            {[["cantoE", "↖ Mergulhar"], ["meio", "↑ Ficar no meio"], ["cantoD", "↗ Mergulhar"]].map(([k, l]) => (
              <button key={k} className="pen-aim-btn pen-def-btn" onClick={() => onDefend(k)}>{l}</button>
            ))}
          </div>
        )}
        {!pens.done && canKick && pens.animating && <div className="pen-wait">Cobrando…</div>}
        {!pens.done && !canKick && <div className="pen-wait">{pens.animating ? "Cobrando…" : "Aguardando a cobrança…"}</div>}
        {pens.done && (() => {
          const penWinner = pens.score[0] > pens.score[1] ? "home" : "away";
          const winnerName = penWinner === "home" ? homeName : awayName;
          const winnerColor = penWinner === "home" ? homeColor : awayColor;
          const iWon = isLocal || mySide === penWinner;
          return (
            <>
              <div className="pen-done">Decidido nos pênaltis!</div>
              <div className="pen-winner" style={{ color: winnerColor }}>{winnerName} vence!</div>
              <div className="pen-actions">
                {isLocal ? (
                  <button className="pen-aim-btn" onClick={onContinue}>Continuar para a próxima partida →</button>
                ) : iWon ? (
                  canFinish
                    ? <button className="pen-aim-btn" onClick={onContinue}>Continuar para a próxima partida →</button>
                    : <div className="pen-wait">Aguardando a próxima partida…</div>
                ) : (
                  <>
                    <div className="pen-elim">Você foi eliminado</div>
                    {canFinish && (
                      <button className="pen-aim-btn" onClick={onContinue}>Avançar torneio (espectador)</button>
                    )}
                    {onLeave && (
                      <button className="pen-aim-btn pen-def-btn" onClick={onLeave}>Sair pro Lobby</button>
                    )}
                  </>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
