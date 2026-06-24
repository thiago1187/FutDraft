import { useEffect, useRef, useState } from "react";
import { createLiveMatch } from "../engine/liveMatch.js";
import { teamRatings } from "../engine/match.js";
import Pitch2D from "./Pitch2D.jsx";

const SPEEDS = [1, 2, 4];

// Inicial do nome do time para o escudo quadrado.
function badge(name = "") {
  const w = name.replace(/\s+FC$/i, "").trim().split(/\s+/);
  return ((w[0]?.[0] || "") + (w[1]?.[0] || w[0]?.[1] || "")).toUpperCase();
}

export default function MatchLive({ match, home, away, homeMgr, awayMgr, myId, isHost, isLocal, room, onFinish }) {
  // O anfitrião roda o relógio (autoritativo) em ambos os modos; os demais assistem.
  const controller = isHost;
  const engineRef = useRef(null);
  const rafRef = useRef(0);
  const lastTs = useRef(0);
  const lastSnap = useRef(0);
  const finishedRef = useRef(false);
  const pensStartedRef = useRef(false);

  const [, setTick] = useState(0);
  const [snap, setSnap] = useState(null);
  const [speed, setSpeed] = useState(2);
  const [paused, setPaused] = useState(false);
  const [tab, setTab] = useState("tatica");
  const [ctrlSide, setCtrlSide] = useState(myOwnedSide());
  const [subOut, setSubOut] = useState(null);
  const [pens, setPens] = useState(null);

  const homeColor = homeMgr?.color || "#E94E27";
  const awayColor = awayMgr?.color || "#2B5BA8";

  function myOwnedSide() {
    if (homeMgr?.id === myId) return "home";
    if (awayMgr?.id === myId) return "away";
    return "home";
  }
  function canControl(side) {
    if (isLocal) return side === ctrlSide;
    if (homeMgr?.id === myId) return side === "home";
    if (awayMgr?.id === myId) return side === "away";
    return isHost; // anfitrião neutro controla ambos
  }

  // ---- CONTROLLER: cria o motor e roda o relógio ----
  useEffect(() => {
    if (!controller) return;
    const eng = createLiveMatch(home, away, {
      knockout: match.knockout,
      homeColor,
      awayColor,
    });
    engineRef.current = eng;

    // recebe comandos dos outros técnicos (online)
    const off = room?.onBroadcast?.((event, data) => {
      if (event !== "cmd" || !engineRef.current) return;
      applyCommand(data);
    });

    const loop = (ts) => {
      const dt = lastTs.current ? ts - lastTs.current : 16;
      lastTs.current = ts;
      const e = engineRef.current;
      if (e && !e.state.paused) e.step(Math.min(dt, 60), speedRef.current);
      // snapshot p/ espectadores (~5x/s) — Supabase (online) ou BroadcastChannel (local 2 abas)
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
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTs.current = 0;
      off && off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // mantém speed atual acessível dentro do loop
  const speedRef = useRef(speed);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  // ---- SPECTATOR: escuta snapshots ----
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
    if (cmd.kind === "sub") {
      const benchPlayer = (cmd.side === "home" ? home.bench : away.bench).find((p) => p.id === cmd.inId);
      e.substitute(cmd.side, cmd.outId, benchPlayer);
    }
  }

  function sendCommand(cmd) {
    if (controller) applyCommand(cmd);
    else room?.broadcast?.("cmd", cmd);
  }

  function setTactic(side, patch) {
    if (!canControl(side)) return;
    sendCommand({ kind: "tactic", side, patch });
    setTick((n) => n + 1);
  }

  function doSub(side, outId, inId) {
    if (!canControl(side)) return;
    sendCommand({ kind: "sub", side, outId, inId });
    setSubOut(null);
    setTick((n) => n + 1);
  }

  function togglePause() {
    const e = engineRef.current;
    if (!e) return;
    const v = e.togglePause();
    setPaused(v);
  }

  function startPens(e) {
    const sh = teamRatings(home.squad);
    const sa = teamRatings(away.squad);
    const probH = Math.min(0.92, Math.max(0.55, 0.62 + (sh.overall - 70) / 120));
    const probA = Math.min(0.92, Math.max(0.55, 0.62 + (sa.overall - 70) / 120));
    const p = { home: [], away: [], probH, probA, turn: "home", done: false, score: [0, 0] };
    setPens(p);
  }

  function kick(aim) {
    setPens((prev) => {
      if (!prev || prev.done) return prev;
      const p = structuredClone(prev);
      const side = p.turn;
      const prob = side === "home" ? p.probH : p.probA;
      // mira no meio é levemente mais arriscada; cantos um pouco melhores
      const adj = aim === "meio" ? -0.05 : 0.03;
      const scored = Math.random() < Math.min(0.95, prob + adj);
      p[side].push(scored);
      if (scored) p.score[side === "home" ? 0 : 1]++;
      p.turn = side === "home" ? "away" : "home";

      // decide se acabou (5 cobranças cada, ou diferença insuperável, ou morte súbita)
      const h = p.home, a = p.away;
      const decided = isPenDecided(h, a, p.score);
      if (decided) {
        p.done = true;
        const result = engineRef.current.result({ home: p.score[0], away: p.score[1], order: buildOrder(h, a) });
        setTimeout(() => finalize(result), 700);
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

  // ---- estado a renderizar (motor local ou snapshot) ----
  const view = controller ? engineRef.current?.state : snap;
  if (!view) {
    return <div className="ml-loading">Preparando a partida…</div>;
  }

  const homeName = homeMgr?.teamName || home.name;
  const awayName = awayMgr?.teamName || away.name;
  const minute = view.minute;
  const phaseLabel =
    view.phase === "INT" ? "Intervalo" : view.phase === "FIM" ? "Fim de jogo" : view.phase === "PEN" ? "Pênaltis" : `${minute}'`;
  const tempo = minute < 45 ? "1º tempo" : "2º tempo";

  return (
    <div className="matchlive">
      {/* broadcast top bar */}
      <div className="ml-top">
        <div className="ml-team ml-team-l">
          <span className="ml-badge" style={{ background: homeColor }}>{badge(homeName)}</span>
          <div className="ml-team-info">
            <div className="ml-team-name">{homeName}</div>
            <div className="ml-team-sub">{home.lineup?.formation?.name} · {capital(view.tactics?.home?.posture)}</div>
          </div>
        </div>
        <div className="ml-score">
          <div className="ml-score-nums">
            <span>{view.score[0]}</span><i>—</i><span>{view.score[1]}</span>
          </div>
          <div className="ml-clock">
            <span className="ml-dot" /> {phaseLabel} · {tempo}
          </div>
        </div>
        <div className="ml-team ml-team-r">
          <div className="ml-team-info ml-right">
            <div className="ml-team-name">{awayName}</div>
            <div className="ml-team-sub">{away.lineup?.formation?.name} · {capital(view.tactics?.away?.posture)}</div>
          </div>
          <span className="ml-badge" style={{ background: awayColor }}>{badge(awayName)}</span>
        </div>
      </div>

      <div className="ml-main">
        <div className="ml-field-wrap">
          <Pitch2D
            tokens={view.tokens}
            ball={view.ball}
            homeColor={homeColor}
            awayColor={awayColor}
            lastEvent={view.lastEvent}
            homeName={homeName}
            awayName={awayName}
          />
        </div>

        {/* SIDE PANEL */}
        <div className="ml-side">
          <div className="ml-tabs">
            {[["lances", "Lances"], ["tatica", "Tática"], ["banco", "Banco"]].map(([k, label]) => (
              <button key={k} className={`ml-tab ${tab === k ? "sel" : ""}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>

          <div className="ml-panel">
            {isLocal && (
              <div className="ml-ctrl-switch">
                {["home", "away"].map((s) => (
                  <button
                    key={s}
                    className={`ml-side-tab ${ctrlSide === s ? "sel" : ""}`}
                    style={{ "--c": s === "home" ? homeColor : awayColor }}
                    onClick={() => setCtrlSide(s)}
                  >
                    {s === "home" ? homeName : awayName}
                  </button>
                ))}
              </div>
            )}

            {tab === "lances" && <FeedPanel events={view.events} homeName={homeName} awayName={awayName} />}
            {tab === "tatica" && (
              <TacticsPanel
                side={isLocal ? ctrlSide : myOwnedSide()}
                tactics={view.tactics}
                canControl={canControl}
                setTactic={setTactic}
              />
            )}
            {tab === "banco" && (
              <BenchPanel
                side={isLocal ? ctrlSide : myOwnedSide()}
                view={view}
                home={home}
                away={away}
                subOut={subOut}
                setSubOut={setSubOut}
                doSub={doSub}
                canControl={canControl}
              />
            )}
          </div>
        </div>
      </div>

      {/* CONTROL BAR (controlador) */}
      {controller && (
        <div className="ml-controls">
          <button className="ml-cbtn" onClick={togglePause}>
            <span className="ml-pause-ico">{paused ? "▶" : "❚❚"}</span>
            <span>{paused ? "Retomar" : "Pausa técnica"}</span>
          </button>
          <button className="ml-cbtn" onClick={() => setTab("banco")}>
            <span className="ml-sub-ico">⇄</span> Substituir
            <span className="ml-sub-count">{Math.min(view.subsLeft?.home ?? 0, 5)}</span>
          </button>
          <div className="ml-spacer" />
          <span className="ml-speed-label">Velocidade</span>
          <div className="ml-speed">
            {SPEEDS.map((s) => (
              <button key={s} className={`ml-spd ${speed === s ? "sel" : ""}`} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>
      )}
      {!controller && <div className="ml-spectating">Assistindo ao vivo — o anfitrião comanda o relógio.</div>}

      {/* PÊNALTIS */}
      {pens && (
        <Penalties
          pens={pens}
          homeName={homeName}
          awayName={awayName}
          homeColor={homeColor}
          awayColor={awayColor}
          canKick={controller}
          onKick={kick}
        />
      )}
    </div>
  );
}

function capital(s = "") {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function compact(s) {
  return {
    minute: s.minute,
    phase: s.phase,
    score: s.score,
    ball: s.ball,
    tokens: {
      home: s.tokens.home.map((t) => ({ id: t.id, num: t.num, x: t.x, y: t.y, pos: t.pos, name: t.name })),
      away: s.tokens.away.map((t) => ({ id: t.id, num: t.num, x: t.x, y: t.y, pos: t.pos, name: t.name })),
    },
    lastEvent: s.lastEvent,
    tactics: s.tactics,
    subsLeft: s.subsLeft,
    events: s.events.slice(-12),
  };
}

function isPenDecided(h, a, score) {
  const hd = h.length, ad = a.length;
  const remainingH = Math.max(0, 5 - hd);
  const remainingA = Math.max(0, 5 - ad);
  if (hd <= 5 || ad <= 5) {
    if (score[0] > score[1] + remainingA) return true;
    if (score[1] > score[0] + remainingH) return true;
  }
  // após 5 cada, morte súbita: decide quando ambos cobraram igual e diferem
  if (hd >= 5 && ad >= 5 && hd === ad && score[0] !== score[1]) return true;
  return false;
}

function buildOrder(h, a) {
  const order = [];
  const n = Math.max(h.length, a.length);
  for (let i = 0; i < n; i++) {
    if (i < h.length) order.push({ side: "home", scored: h[i] });
    if (i < a.length) order.push({ side: "away", scored: a[i] });
  }
  return order;
}

function FeedPanel({ events, homeName, awayName }) {
  const items = [...events].reverse().slice(0, 30);
  return (
    <div className="ml-feed">
      {items.length === 0 && <div className="ml-muted">Bola rolando…</div>}
      {items.map((e, i) => (
        <div key={i} className={`ml-feed-row ${e.type}`}>
          <span className="ml-feed-min">{e.minute}'</span>
          <span className="ml-feed-ico">{feedIcon(e.type)}</span>
          <span className="ml-feed-txt">{feedText(e, homeName, awayName)}</span>
        </div>
      ))}
    </div>
  );
}

function feedIcon(t) {
  return t === "goal" ? "⚽" : t === "save" ? "🧤" : t === "corner" ? "⛳" : t === "sub" ? "⇄" : t === "whistle" ? "🔔" : "•";
}
function feedText(e, homeName, awayName) {
  const team = e.side === "home" ? homeName : awayName;
  if (e.type === "goal") return `GOL! ${e.scorer} (${team})`;
  if (e.type === "save") return `Defesa do goleiro (${team})`;
  if (e.type === "shot") return `Finalização para fora (${team})`;
  if (e.type === "corner") return `Escanteio (${team})`;
  if (e.type === "sub") return `Sai ${e.outName}, entra ${e.inName}`;
  if (e.type === "whistle") return e.text || "Apito";
  return "";
}

const POSTURES = [["defensivo", "Defensivo"], ["equilibrado", "Equilibrado"], ["ofensivo", "Ofensivo"]];
const LINES = [["recuada", "Recuada"], ["media", "Média"], ["alta", "Alta"]];
const MARKING = [["leve", "Leve"], ["pressao", "Pressão alta"]];

function TacticsPanel({ side, tactics, canControl, setTactic }) {
  const t = tactics?.[side] || {};
  const locked = !canControl(side);
  const Row = (label, options, key) => (
    <>
      <div className="ml-tac-label">{label}</div>
      <div className="ml-seg">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            className={`ml-seg-item ${t[key] === val ? "sel" : ""}`}
            disabled={locked}
            onClick={() => setTactic(side, { [key]: val })}
          >
            {lbl}
          </button>
        ))}
      </div>
    </>
  );
  return (
    <div className="ml-tactics">
      {Row("Postura", POSTURES, "posture")}
      {Row("Linha defensiva", LINES, "line")}
      {Row("Marcação", MARKING, "marking")}
      {locked && <p className="ml-muted">Você só ajusta o seu time.</p>}
    </div>
  );
}

function BenchPanel({ side, view, home, away, subOut, setSubOut, doSub, canControl }) {
  const onField = view.tokens[side];
  const bench = side === "home" ? home.bench : away.bench;
  const locked = !canControl(side);
  const subsLeft = view.subsLeft?.[side] ?? 0;

  return (
    <div className="ml-bench">
      <div className="ml-tac-label">Em campo {subOut ? "· quem entra?" : "· toque em quem sai"}</div>
      <div className="ml-onfield">
        {onField.map((t) => (
          <button
            key={t.id}
            className={`ml-pl ${subOut === t.id ? "out" : ""}`}
            disabled={locked}
            onClick={() => setSubOut(subOut === t.id ? null : t.id)}
          >
            <span className="ml-pl-num">{t.num}</span>
            <span className="ml-pl-name">{t.name}</span>
          </button>
        ))}
      </div>
      <div className="ml-tac-label">Banco · {subsLeft} trocas restantes</div>
      <div className="ml-benchlist">
        {(!bench || bench.length === 0) && <div className="ml-muted">Sem reservas.</div>}
        {bench?.map((p) => (
          <button
            key={p.id}
            className="ml-pl bench"
            disabled={locked || !subOut || subsLeft <= 0}
            onClick={() => subOut && doSub(side, subOut, p.id)}
          >
            <span className="ml-pl-flag">{p.flag}</span>
            <span className="ml-pl-name">{p.name}</span>
            <span className="ml-pl-ovr">{p.ovr}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Penalties({ pens, homeName, awayName, homeColor, awayColor, canKick, onKick }) {
  const dots = (arr, n = 5) => {
    const out = [];
    for (let i = 0; i < Math.max(n, arr.length); i++) {
      if (i < arr.length) out.push(arr[i] ? "scored" : "missed");
      else out.push("pending");
    }
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
        <div className="pen-goal">
          <div className="pen-net" />
          <div className="pen-ball" />
          <div className="pen-shooting">
            Vez: {pens.turn === "home" ? homeName : awayName}
          </div>
        </div>
        <div className="pen-rows">
          <div className="pen-row">
            <span className="pen-tag" style={{ color: homeColor }}>{badge(homeName)}</span>
            <div className="pen-dots">
              {dots(pens.home).map((d, i) => <span key={i} className={`pen-dot ${d}`} />)}
            </div>
          </div>
          <div className="pen-row">
            <span className="pen-tag" style={{ color: awayColor }}>{badge(awayName)}</span>
            <div className="pen-dots">
              {dots(pens.away).map((d, i) => <span key={i} className={`pen-dot ${d}`} />)}
            </div>
          </div>
        </div>
        {!pens.done && canKick && (
          <>
            <div className="pen-aim">
              {[["cantoE", "↖ Canto"], ["meio", "↑ Meio"], ["cantoD", "↗ Canto"]].map(([k, l]) => (
                <button key={k} className="pen-aim-btn" onClick={() => onKick(k)}>{l}</button>
              ))}
            </div>
          </>
        )}
        {!pens.done && !canKick && <div className="pen-wait">Aguardando a cobrança…</div>}
        {pens.done && <div className="pen-done">Decidido nos pênaltis!</div>}
      </div>
    </div>
  );
}
