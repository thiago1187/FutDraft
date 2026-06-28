import { useEffect, useRef, useState } from "react";
import { createLiveMatch, penaltyScored } from "../engine/liveMatch.js";
import { teamRatings } from "../engine/match.js";
import { PRESETS, computeSynergy, matchingPreset } from "../engine/tactics.js";
import { leagueTable, applyMatchResult } from "../engine/tournament.js";
import { escudoImg, Avatar } from "./bits.jsx";
import { listMyTactics } from "../lib/savedTactics.js";
import { playWhistle, playGoal, preloadGoal } from "../lib/audio.js";
import { reconcileSpectatorView } from "../lib/clockSync.js";
import Pitch2D from "./Pitch2D.jsx";
import PostMatch from "./PostMatch.jsx";

const SPEEDS = [1, 2, 3];
// Congelamento dramático (freeze-frame) no gol/vermelho — duração em TEMPO REAL de relógio
// de parede, igual em qualquer velocidade. Fácil de ajustar.
const GOAL_HOLD_MS = 1700;
const RED_HOLD_MS = 1500;
const PEN_DIRS = ["cantoE", "meio", "cantoD"];
const PEN_TIMER_MS = 7000; // disputa de pênaltis: tempo p/ escolher (depois vai no aleatório)
const IG_PEN_TIMER_MS = 6000; // pênalti EM JOGO: tempo p/ escolher canto/mergulho
const rndDir = () => PEN_DIRS[Math.floor(Math.random() * PEN_DIRS.length)];
const otherSide = (s) => (s === "home" ? "away" : "home");
const POS_ORDER = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
const shortPos = (pos) => (pos === "GK" ? "GOL" : pos === "DEF" ? "DEF" : pos === "MID" ? "MEI" : "ATA");

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

// Momentum (-1 = só o visitante criando perigo … +1 = só o mandante): média móvel do xG
// AO VIVO nos últimos ~8 min. Leitura pura do que o motor já produz (state.xgTimeline);
// não altera nada da simulação.
function momentumFromXg(timeline) {
  if (!Array.isArray(timeline) || timeline.length < 2) return 0;
  const last = timeline[timeline.length - 1];
  const cutoff = last.m - 8;
  let base = timeline[0];
  for (let i = timeline.length - 1; i >= 0; i--) { if (timeline[i].m <= cutoff) { base = timeline[i]; break; } }
  const dh = Math.max(0, last.h - base.h), da = Math.max(0, last.a - base.a);
  const tot = dh + da;
  if (tot < 0.05) return 0; // pouca ação recente → neutro
  return Math.max(-1, Math.min(1, (dh - da) / tot));
}

// Narração curta em PT dos eventos que o motor JÁ emite (não inventa nada). Retorna
// null p/ eventos sem narração (chute, escanteio, etc.).
function narrateEvent(ev, homeName, awayName) {
  if (!ev) return null;
  const team = ev.side === "home" ? homeName : ev.side === "away" ? awayName : "";
  const m = ev.minute != null ? `${ev.minute}'` : "";
  switch (ev.type) {
    case "goal": return { ic: "⚽", cls: "goal", tx: `${ev.pen ? "Gol de pênalti!" : "Gol!"} ${ev.scorer ? ev.scorer + " · " : ""}${team}`.trim(), m };
    case "yellow": return { ic: "🟨", cls: "yellow", tx: `Amarelo — ${ev.name || ""} ${team}`.trim(), m };
    case "red": return { ic: "🟥", cls: "red", tx: `Vermelho — ${ev.name || ""} ${team}`.trim(), m };
    case "sub": return { ic: "🔁", cls: "sub", tx: `Troca — ${ev.outName || "?"} ↔ ${ev.inName || "?"} ${team}`.trim(), m };
    case "save": return ev.pen ? { ic: "🧤", cls: "save", tx: `Pênalti defendido! ${team}`.trim(), m } : null;
    case "whistle": return { ic: "📣", cls: "whistle", tx: ev.text || "Apito", m: "" };
    default: return null;
  }
}

export default function MatchLive({ match, home, away, homeMgr, awayMgr, myId, isHost, isLocal, room, onFinish, onLeave, forcePens, tournament, players, restore, onPersist, managerTactics }) {
  const controller = isHost;
  const engineRef = useRef(null);
  const rafRef = useRef(0);
  const lastTs = useRef(0);
  const lastSnap = useRef(0);
  const lastRender = useRef(0);
  const lastPersist = useRef(0);
  const restoreRef = useRef(restore);
  restoreRef.current = restore; // mantém o último estado salvo acessível na hora da posse
  const finishedRef = useRef(false);
  const pensStartedRef = useRef(false);
  const penResultRef = useRef(null);
  const finalRef = useRef(null);
  const endResultRef = useRef(null); // resultado retido p/ a tela de fim de partida (liga)
  const speedRef = useRef(1);
  const freezeRef = useRef({ id: null, until: 0 }); // timer do congelamento dramático (host)

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
  const sideIsBot = (s) => !!((s === "home" ? homeMgr : awayMgr)?.isBot);

  const [, setTick] = useState(0);
  const [snap, setSnap] = useState(null);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [ctrlSide, setCtrlSide] = useState(controllable[0] || "home");
  const [pens, setPens] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const [tacticsOpen, setTacticsOpen] = useState(false);
  const [ended, setEnded] = useState(false); // liga: tela de fim com a classificação

  const canControl = (side) => controllable.includes(side);
  const mySide = controllable.includes(ctrlSide) ? ctrlSide : (controllable[0] || "home");

  // Tema na cor do time SÓ quando há um único dono claro (eu sou o técnico de um lado).
  const themeColor = controllable.length === 1 ? colorOf(controllable[0]) : null;

  useEffect(() => { speedRef.current = speed; }, [speed]);

  // ---- CONTROLLER ----
  // Roda quando EU sou (ou viro) o anfitrião. Se há estado salvo (restore), a partida
  // REIDRATA de onde parou (migração de host); senão, começa do zero. Depende de
  // `controller` → um espectador que assume o comando passa a simular na hora.
  useEffect(() => {
    if (!controller) return;
    const resume = restoreRef.current; // captura o último estado salvo no momento da posse
    const eng = createLiveMatch(home, away, {
      knockout: match.knockout, homeColor, awayColor, seed: match.seed,
      restore: resume || undefined,
      cpu: { home: !!homeMgr?.isBot, away: !!awayMgr?.isBot },
    });
    engineRef.current = eng;
    // Táticas pré-definidas no ready-gate: o host (autoritativo) aplica as dos dois técnicos
    // ao criar a partida nova (não na reidratação). Usa o setTactic público do motor —
    // só preenche state.tactics; não muda a lógica de simulação.
    if (!resume && managerTactics) {
      const ht = managerTactics[homeMgr?.id];
      const at = managerTactics[awayMgr?.id];
      if (ht) eng.setTactic("home", ht);
      if (at) eng.setTactic("away", at);
    }
    if (!resume && forcePens) {
      eng.beginMatch();
      eng.state.phase = "PEN";
      eng.state.minute = 90;
      pensStartedRef.current = true;
      startPens(eng);
    }
    const off = room?.onBroadcast?.((event, data) => {
      if (event === "cmd" && engineRef.current) applyCommand(data);
    });
    const loop = (ts) => {
      // partida acabou (mata-mata finalizado OU tela de fim da liga) → para o loop
      // (antes ficava rodando step()+setTick a 60fps na tela de fim, gastando CPU).
      if (finishedRef.current || endResultRef.current) return;
      // BUG: na disputa de pênaltis a simulação 2D NÃO pode seguir rodando atrás do
      // overlay (desperdício de CPU). Para o tick/RAF — só o fluxo de pênalti segue,
      // tocado pelo componente Penalties. Cobre tanto a entrada normal quanto forcePens.
      if (pensStartedRef.current) { rafRef.current = 0; return; }
      const dt = lastTs.current ? ts - lastTs.current : 16;
      lastTs.current = ts;
      const e = engineRef.current;
      // CONGELAMENTO DRAMÁTICO (só RENDER): no gol/vermelho segura a cena por tempo REAL de
      // relógio de parede (Date.now), independente da velocidade. Enquanto congelado NÃO dá
      // step → bola/jogadores/relógio param (a cinematic segue na cena: a bola fica na rede).
      // No fim, limpa a cinematic p/ o motor seguir sem re-segurar (evita pausa dobrada).
      // Bot×bot não congela. Não muda cálculo/seed/resultado.
      let frozen = false;
      const cin = e?.state?.cinematic;
      const dramaticCine = cin && humanSides.length > 0 && ((cin.type === "shot" && cin.outcome === "goal") || cin.type === "red");
      if (dramaticCine) {
        if (freezeRef.current.id !== cin.id) freezeRef.current = { id: cin.id, until: Date.now() + (cin.outcome === "goal" ? GOAL_HOLD_MS : RED_HOLD_MS) };
        if (Date.now() < freezeRef.current.until) frozen = true;
        else { e.state.cinematic = null; freezeRef.current = { id: null, until: 0 }; }
      } else if (freezeRef.current.id) {
        freezeRef.current = { id: null, until: 0 };
      }
      if (e && !e.state.paused && !frozen) e.step(Math.min(dt, 60), speedRef.current);
      // rede de segurança: se os dois lados já estão prontos (ex.: bot×bot), começa.
      if (e && !e.state.started && e.state.preReady?.home && e.state.preReady?.away) e.state.started = true;
      // pênalti EM JOGO recém-marcado → arma o prazo de 4s (fonte: state do motor)
      if (e?.state?.penaltyPending && e.state.penaltyPending.deadline === 0) {
        e.state.penaltyPending.deadline = Date.now() + IG_PEN_TIMER_MS;
      }
      if (room && ts - lastSnap.current > 200) {
        lastSnap.current = ts;
        room.broadcast("snap", compact(e.state));
      }
      // Canal CONFIÁVEL da verdade do host: persiste o estado vivo em rooms.state a cada
      // ~1,5s. Serve ao T7 (se o host cai, o novo reidrata daqui) E à sincronização do
      // relógio do espectador — que SALTA pra cá quando o broadcast (snap) atrasa/cai, então
      // o não-host nunca fica mais que ~1,5s atrás do host (ver src/lib/clockSync.js).
      if (onPersist && e && ts - lastPersist.current > 1500) {
        lastPersist.current = ts;
        try { onPersist(e.serialize()); } catch (_) {}
      }
      if (e?.needsPens?.() && !pensStartedRef.current) {
        pensStartedRef.current = true;
        startPens(e);
        return; // para o loop aqui: a disputa assume e o sim 2D não roda no fundo
      } else if (e?.isOver?.() && !finishedRef.current && !endResultRef.current) {
        const res = e.result();
        // Mata-mata avança direto; pontos corridos para na tela de fim com a tabela.
        if (match.knockout) finalize(res);
        else { endResultRef.current = res; setEnded(true); }
      }
      // throttle do re-render a ~30fps (o motor segue avançando a cada frame; só a
      // renderização React é limitada — corta pela metade o custo no mobile).
      if (ts - lastRender.current > 33) { lastRender.current = ts; setTick((n) => (n + 1) % 1000000); }
      if (!finishedRef.current && !endResultRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    // anti-AFK: se alguém não confirmar "Pronto" em 30s, começa mesmo assim.
    const afk = setTimeout(() => { engineRef.current?.beginMatch?.(); setTick((n) => n + 1); }, 30000);
    return () => { cancelAnimationFrame(rafRef.current); lastTs.current = 0; clearTimeout(afk); off && off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // ---- SPECTATOR ----
  useEffect(() => {
    if (controller) return;
    const off = room?.onBroadcast?.((event, data) => {
      if (event === "snap") setSnap(data);
      if (event === "pens") setPens(data);
      if (event === "final" && data?.result) { finalRef.current = data.result; setFinalResult(data.result); }
    });
    return () => off && off();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller]);

  // ---- ÁRBITRO DOS PÊNALTIS (anfitrião) ----
  // Preenche o lado da CPU na hora; espera os humanos até o prazo de 3s e então
  // sorteia o que faltar; quando cobrador e goleiro escolheram, dispara a cobrança.
  useEffect(() => {
    if (!controller || !pens || pens.done || pens.animating) return;
    const shoot = pens.turn, goalie = otherSide(pens.turn);
    if (pens.picks?.aim == null && sideIsBot(shoot)) { penApplyPick("aim", rndDir(), pens.round); return; }
    if (pens.picks?.gk == null && sideIsBot(goalie)) { penApplyPick("gk", rndDir(), pens.round); return; }
    if (pens.picks?.aim != null && pens.picks?.gk != null) { resolvePenKick(); return; }
    const ms = Math.max(0, (pens.deadline || 0) - Date.now());
    const id = setTimeout(() => {
      setPens((prev) => {
        if (!prev || prev.done || prev.animating) return prev;
        const p = structuredClone(prev);
        if (p.picks.aim == null) p.picks.aim = rndDir();
        if (p.picks.gk == null) p.picks.gk = rndDir();
        const side = p.turn;
        const scored = p.picks.gk !== p.picks.aim;
        p.lastKick = { aim: p.picks.aim, scored, gkDir: p.picks.gk, side, id: (prev.lastKick?.id || 0) + 1 };
        p.animating = true;
        if (room) room.broadcast("pens", p);
        return p;
      });
    }, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, pens?.round, pens?.picks?.aim, pens?.picks?.gk, pens?.animating, pens?.done, pens?.turn]);

  // ---- ÁRBITRO DO PÊNALTI EM JOGO (anfitrião) ----
  // Espera o cobrador (canto) e o goleiro (mergulho); auto-preenche bots; no prazo de 4s
  // sorteia o que faltar e dispara a cobrança. NUNCA trava — o host sempre resolve.
  const ppArb = controller ? engineRef.current?.state?.penaltyPending : null;
  useEffect(() => {
    if (!controller) return;
    const pp = engineRef.current?.state?.penaltyPending;
    if (!pp || pp.animating || !pp.deadline) return;
    const shoot = pp.att, goalie = otherSide(pp.att);
    if (pp.picks.aim == null && sideIsBot(shoot)) { pp.picks.aim = rndDir(); setTick((n) => n + 1); return; }
    if (pp.picks.gk == null && sideIsBot(goalie)) { pp.picks.gk = rndDir(); setTick((n) => n + 1); return; }
    if (pp.picks.aim != null && pp.picks.gk != null) { igPenFire(); return; }
    const ms = Math.max(0, pp.deadline - Date.now());
    const id = setTimeout(() => {
      const p2 = engineRef.current?.state?.penaltyPending;
      if (!p2 || p2.animating) return;
      if (p2.picks.aim == null) p2.picks.aim = rndDir();
      if (p2.picks.gk == null) p2.picks.gk = rndDir();
      igPenFire();
    }, ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller, ppArb?.id, ppArb?.picks?.aim, ppArb?.picks?.gk, ppArb?.animating, ppArb?.deadline]);

  // Host: dispara a cobrança (define o lance) quando cobrador e goleiro escolheram.
  function igPenFire() {
    const pp = engineRef.current?.state?.penaltyPending;
    if (!pp || pp.animating || pp.picks.aim == null || pp.picks.gk == null) return;
    // Duelo de cantos DOMINA, mas a qualidade do batedor/goleiro (prob) modula:
    // goleiro acertou o canto → defesa provável (craque ainda marca às vezes); errou → gol
    // quase certo (mas batedor fraco ainda pode perder).
    const matched = pp.picks.gk === pp.picks.aim;
    const prob = pp.prob ?? 0.78;
    // mesma mecânica do harness (calibrada ~67%) → jogo e calibração batem.
    const scored = penaltyScored(prob, pp.picks.aim, pp.picks.gk, Math.random);
    // desfecho COERENTE com a animação: gol / defesa (goleiro acertou o canto) / pra fora
    // (goleiro foi pro lado errado e o batedor errou — a bola sai, não é "defesa").
    const outcome = scored ? "goal" : matched ? "save" : "miss";
    pp.lastKick = { aim: pp.picks.aim, scored, gkDir: pp.picks.gk, outcome, side: pp.att, id: pp.id };
    pp.animating = true;
    setTick((n) => n + 1);
  }
  // Host registra uma escolha (canto do cobrador OU mergulho do goleiro).
  function igPenApplyPick(role, value, id) {
    const pp = engineRef.current?.state?.penaltyPending;
    if (!pp || pp.animating) return;
    if (id != null && pp.id !== id) return; // pick de um pênalti antigo
    if (pp.picks[role] != null) return;
    pp.picks[role] = value;
    setTick((n) => n + 1);
  }
  // Uma escolha local da mini-tela. No online manda intent; no host/local aplica direto.
  function igPenChoose(role, value) {
    if (controller) igPenApplyPick(role, value, engineRef.current?.state?.penaltyPending?.id);
    else room?.broadcast?.("cmd", { kind: "igpenpick", role, value, id: snap?.penaltyPending?.id });
  }
  // Host: após a animação, aplica o resultado no motor (gol/erro) e RETOMA o jogo.
  function igPenCommit() {
    const pp = engineRef.current?.state?.penaltyPending;
    if (!pp || !pp.lastKick) return;
    engineRef.current.resolvePenalty(pp.lastKick.scored, pp.lastKick.aim, pp.lastKick.gkDir, pp.lastKick.outcome);
    setTick((n) => n + 1);
  }

  function applyCommand(cmd) {
    const e = engineRef.current;
    if (!e) return;
    if (cmd.kind === "tactic") e.setTactic(cmd.side, cmd.patch);
    if (cmd.kind === "ready") e.setReady(cmd.side);
    if (cmd.kind === "matchready") e.setPreReady(cmd.side);
    if (cmd.kind === "penpick") penApplyPick(cmd.role, cmd.value, cmd.round);
    if (cmd.kind === "igpenpick") igPenApplyPick(cmd.role, cmd.value, cmd.id);
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
  // READY-GATE de início: cada técnico confirma "Pronto"; a partida só começa quando
  // os dois confirmam (CPU já entra pronta). O anfitrião NÃO força o início.
  function matchReadyUp() {
    const sides = isLocal ? humanSides : controllable;
    for (const s of sides) {
      if (controller) engineRef.current?.setPreReady(s);
      else room?.broadcast?.("cmd", { kind: "matchready", side: s });
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
  function startPens() {
    setPens({
      home: [], away: [], turn: "home", score: [0, 0],
      round: 0, picks: { aim: null, gk: null }, deadline: Date.now() + PEN_TIMER_MS,
      animating: false, done: false,
    });
  }
  // Uma escolha local (canto do cobrador OU mergulho do goleiro). No online, manda
  // a intent pro anfitrião; no anfitrião/local, aplica direto.
  function penChoose(role, value) {
    const round = pens?.round;
    if (controller) penApplyPick(role, value, round);
    else room?.broadcast?.("cmd", { kind: "penpick", role, value, round });
  }
  // Anfitrião registra a escolha de um lado (aim = cobrador, gk = goleiro).
  function penApplyPick(role, value, round) {
    setPens((prev) => {
      if (!prev || prev.done || prev.animating) return prev;
      if (round != null && prev.round !== round) return prev; // escolha de rodada antiga
      if (prev.picks?.[role] != null) return prev; // já escolhido
      const p = structuredClone(prev);
      p.picks[role] = value;
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  // Anfitrião dispara a cobrança quando cobrador e goleiro já escolheram.
  function resolvePenKick() {
    setPens((prev) => {
      if (!prev || prev.done || prev.animating) return prev;
      if (prev.picks?.aim == null || prev.picks?.gk == null) return prev;
      const p = structuredClone(prev);
      const side = p.turn;
      const scored = p.picks.gk !== p.picks.aim; // goleiro acertou o canto = defesa
      p.lastKick = { aim: p.picks.aim, scored, gkDir: p.picks.gk, side, id: (prev.lastKick?.id || 0) + 1 };
      p.animating = true;
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  // Registra o resultado do lance e prepara a próxima cobrança (reseta escolhas e timer).
  function commitKick() {
    setPens((prev) => {
      if (!prev || !prev.lastKick || !prev.animating) return prev;
      const p = structuredClone(prev);
      const { side, scored } = p.lastKick;
      p[side].push(scored);
      if (scored) p.score[side === "home" ? 0 : 1]++;
      p.turn = otherSide(side);
      p.animating = false;
      p.picks = { aim: null, gk: null };
      p.round = (p.round || 0) + 1;
      p.deadline = Date.now() + PEN_TIMER_MS;
      if (isPenDecided(p.home, p.away, p.score)) {
        p.done = true;
        if (engineRef.current) penResultRef.current = engineRef.current.result({ home: p.score[0], away: p.score[1], order: [] });
      }
      if (room) room.broadcast("pens", p);
      return p;
    });
  }
  function finalize(result) {
    // Fim de jogo → mostra o pós-jogo (súmula + corrida de xG + história). Só avança
    // o torneio quando o anfitrião clica "Continuar". Espectadores recebem a súmula.
    if (finishedRef.current) return;
    finishedRef.current = true;
    cancelAnimationFrame(rafRef.current);
    finalRef.current = result;
    setFinalResult(result);
    if (room) {
      // Persistência CONFIÁVEL do fim: além do broadcast (que pode cair), grava o estado
      // final (phase FIM/over) em rooms.state. Assim o espectador reconcilia o relógio para
      // o fim mesmo se o evento "final" se perder — nunca fica preso num minuto anterior.
      try { if (onPersist && engineRef.current) onPersist(engineRef.current.serialize()); } catch (_) {}
      room.broadcast("final", { matchId: match.id, result });
    }
  }

  // Host renderiza o próprio motor. Espectador: NUNCA conta o tempo — segue o host e SALTA
  // se ficar pra trás, conciliando o broadcast (snap, rápido) com o estado confiável de
  // rooms.state (restore, re-sincroniza no reconnect). Ver src/lib/clockSync.js.
  const view = controller ? engineRef.current?.state : reconcileSpectatorView(snap, restore?.state);
  if (!view) return <div className="ml-loading">Preparando a partida…</div>;
  const igPen = view.penaltyPending; // pênalti EM JOGO (motor no host / snapshot no cliente)

  const homeName = homeMgr?.teamName || home.name;
  const awayName = awayMgr?.teamName || away.name;
  const minute = view.minute;
  const phaseLabel = view.phase === "INT" ? "Intervalo" : view.phase === "FIM" ? "Fim de jogo" : view.phase === "PEN" ? "Pênaltis" : `${minute}'`;
  const tempo = minute < 45 ? "1º tempo" : "2º tempo";
  const sideColor = colorOf(mySide);
  const sideName = mySide === "home" ? homeName : awayName;
  const iAmManager = controllable.length > 0;
  const stats = view.stats || { possession: [1, 1], shots: [0, 0], onTarget: [0, 0], corners: [0, 0] };
  // momentum: do snapshot (cliente) ou calculado do xgTimeline do motor (host).
  const mom = typeof view.mom === "number" ? view.mom : momentumFromXg(view.xgTimeline);
  const homePct = Math.round(((mom + 1) / 2) * 100);
  // Congelamento dramático de gol/vermelho: o freeze da CENA é por partida (humano em campo;
  // bot×bot não congela), e o overlay anima a menos que o usuário tenha pedido menos
  // movimento (reduce-motion → texto estático, sem pulsar/tremer).
  const reduceMotion = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const dramaticActive = humanSides.length > 0;

  // Tela de fim de partida (pontos corridos): classificação JÁ com o resultado aplicado.
  const endStandings = (() => {
    if (!ended || !endResultRef.current || !tournament || !players) return null;
    const isLeague = tournament.format === "league" || (tournament.fixtures && !tournament.rounds);
    if (!isLeague) return null;
    const tc = structuredClone(tournament);
    applyMatchResult(tc, match.id, endResultRef.current, players);
    return leagueTable(tc, players);
  })();

  // Gols por jogador (controller deriva dos eventos; espectador recebe pronto) e capitão (maior OVR do XI).
  const goalsBy = view.goalsBy || (() => {
    const m = {};
    for (const e of view.events || []) if (e.type === "goal" && e.scorerId != null) m[e.scorerId] = (m[e.scorerId] || 0) + 1;
    return m;
  })();
  const captainOf = (team) => (team?.squad || []).reduce((b, p) => (!b || p.ovr > b.ovr ? p : b), null)?.id;
  const homeCaptainId = captainOf(home);
  const awayCaptainId = captainOf(away);

  return (
    <div className={"matchlive-full" + (themeColor ? " themed" : "")} style={themeColor ? { "--team": themeColor } : undefined}>
      {/* READY-GATE — a partida só começa quando os técnicos confirmam (host não força) */}
      {view && !view.started && !finalResult && (
        <div className="ml-pregame">
          <div className="ml-pregame-card">
            <span className="pen-eyebrow">Antes de começar · pré-análise</span>
            <div className="ml-pregame-title">{homeName} <i>vs</i> {awayName}</div>

            {/* PRÉ-ANÁLISE — força de cada time (ataque/defesa/geral) + elenco */}
            <div className="ml-pre-analysis">
              {["home", "away"].map((s) => {
                const sq = (s === "home" ? home : away).squad || [];
                const r = teamRatings(sq);
                const col = s === "home" ? homeColor : awayColor;
                const xi = [...sq].sort((a, b) => (POS_ORDER[a.pos] - POS_ORDER[b.pos]) || b.ovr - a.ovr);
                return (
                  <div key={s} className="ml-pre-team">
                    <div className="ml-pre-name" style={{ color: col }}>{s === "home" ? homeName : awayName}</div>
                    <div className="ml-pre-ovrs">
                      <div className="ml-pre-ovr big" style={{ "--c": col }}><b>{Math.round(r.overall)}</b><span>Geral</span></div>
                      <div className="ml-pre-ovr"><b>{Math.round(r.attack)}</b><span>Ataque</span></div>
                      <div className="ml-pre-ovr"><b>{Math.round(r.defense)}</b><span>Defesa</span></div>
                    </div>
                    <div className="ml-pre-xi">
                      {xi.map((p) => (
                        <div key={p.id} className="ml-pre-pl">
                          <span className="ml-pre-pos">{shortPos(p.pos)}</span>
                          <span className="ml-pre-plname">{lastName(p.name)}</span>
                          <span className="ml-pre-plovr">{p.ovr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="ml-pregame-ready">
              {["home", "away"].filter((s) => !sideIsBot(s)).map((s) => (
                <div key={s} className={`ml-pregame-row ${view.preReady?.[s] ? "ok" : ""}`}>
                  <span className="ml-pregame-name">{s === "home" ? homeName : awayName}</span>
                  <span className="ml-pregame-st">{view.preReady?.[s] ? "Pronto ✓" : "aguardando…"}</span>
                </div>
              ))}
            </div>
            {controllable.some((s) => !view.preReady?.[s]) ? (
              <button className="btn btn-primary btn-block btn-lg" onClick={matchReadyUp}>Estou pronto →</button>
            ) : controllable.length > 0 ? (
              <div className="waiting">✓ Pronto! Aguardando o adversário…</div>
            ) : (
              <div className="waiting">Aguardando os técnicos confirmarem…</div>
            )}
            {onLeave && <button className="btn btn-ghost btn-block" onClick={onLeave}>Sair da partida</button>}
          </div>
        </div>
      )}
      {/* PÓS-JOGO — súmula completa + corrida de xG + história */}
      {finalResult?.summary && (
        <PostMatch
          summary={finalResult.summary} events={finalRef.current?.events} homeMgr={homeMgr} awayMgr={awayMgr} myId={myId}
          canFinish={controller} onContinue={() => onFinish(finalRef.current)} onLeave={onLeave}
        />
      )}
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

      {/* MOMENTUM — quem está pressionando (média móvel do xG ao vivo). Só leitura. */}
      {view.started && view.phase !== "FIM" && view.phase !== "PEN" && (
        <div className="mlf-momentum" title="Pressão recente — média do xG dos últimos minutos">
          <span className="mlf-mom-cap" style={{ color: homeColor }}>{homeName}</span>
          <div className="mlf-mom-track">
            <div className="mlf-mom-fill" style={{ width: `${homePct}%`, background: homeColor }} />
            <div className="mlf-mom-fill" style={{ width: `${100 - homePct}%`, background: awayColor }} />
            <span className="mlf-mom-mid" />
          </div>
          <span className="mlf-mom-cap" style={{ color: awayColor }}>{awayName}</span>
        </div>
      )}

      {/* NARRAÇÃO — faixa curta dos lances que o motor já emitiu (só leitura) */}
      {view.started && (() => {
        const feed = (view.events || []).map((ev) => narrateEvent(ev, homeName, awayName)).filter(Boolean).slice(-3).reverse();
        if (!feed.length) return null;
        return (
          <div className="mlf-narration" aria-live="polite">
            {feed.map((f, i) => (
              <div key={`${f.m}-${f.cls}-${f.tx}`} className={`mlf-narr ${f.cls}${i === 0 ? " latest" : ""}`}>
                <span className="mlf-narr-ic">{f.ic}</span>
                <span className="mlf-narr-tx">{f.tx}</span>
                {f.m && <span className="mlf-narr-min">{f.m}</span>}
              </div>
            ))}
          </div>
        );
      })()}

      {/* MAIN — escalações dos dois lados + campo (estilo transmissão) */}
      <div className="mlf-main">
        <aside className="mlf-side">
          <LineupPanel name={homeName} color={homeColor} formationName={home.lineup?.formation?.name}
            tokens={view.tokens.home} captainId={homeCaptainId} goalsBy={goalsBy} />
        </aside>

        {/* CENTRO — campo */}
        <div className="mlf-center">
          <Pitch2D tokens={view.tokens} ball={view.ball} homeColor={homeColor} awayColor={awayColor}
            cinematic={view.cinematic} carrier={view.carrier} homeName={homeName} awayName={awayName} />
          <CineOverlay cine={view.cinematic} dramatic={dramaticActive} scorer={view.lastEvent?.type === "goal" ? view.lastEvent.scorer : null} homeName={homeName} awayName={awayName} homeColor={homeColor} awayColor={awayColor} />
          <FreezeOverlay cine={view.cinematic} active={dramaticActive} reduced={reduceMotion} scorer={view.lastEvent?.type === "goal" ? view.lastEvent.scorer : null}
            homeColor={homeColor} awayColor={awayColor} homeName={homeName} awayName={awayName} />
          <AudioCues active={humanSides.length > 0} started={!!view.started} lastEvent={view.lastEvent} />
        </div>

        <aside className="mlf-side">
          <LineupPanel name={awayName} color={awayColor} formationName={away.lineup?.formation?.name}
            tokens={view.tokens.away} captainId={awayCaptainId} goalsBy={goalsBy} mirror />
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
      <div className="mlf-controls">
        {iAmManager && (
          <button className="mlf-cbtn ghost" onClick={() => setTacticsOpen(true)}>⚙ Tática</button>
        )}
        {controller ? (
          <>
            <button className={`mlf-cbtn ${paused ? "resume" : ""}`} onClick={() => { togglePause(); if (!paused) { if (iAmManager) setTacticsOpen(true); } else setTacticsOpen(false); }}>
              <span>{paused ? "▶" : "❚❚"}</span> {paused ? "Retomar jogo" : "Pausa técnica"}
            </button>
            <div className="mlf-spacer" />
            <span className="mlf-speed-label">Velocidade</span>
            <div className="mlf-speed">
              {SPEEDS.map((s) => <button key={s} className={`mlf-spd ${speed === s ? "sel" : ""}`} onClick={() => setSpeed(s)}>{s}×</button>)}
            </div>
          </>
        ) : (
          <span className="ml-spectating">Assistindo ao vivo — o anfitrião comanda o relógio.</span>
        )}
      </div>

      {/* TÁTICA — overlay (mantém o controle ao vivo sem ocupar a tela toda).
          Enquanto há pênalti (em jogo ou disputa), a tática fica escondida: o pênalti
          tem prioridade total na tela e volta a aparecer quando o lance termina. */}
      {tacticsOpen && iAmManager && !igPen && !pens && (
        <div className="mlf-tactics-overlay" onClick={() => setTacticsOpen(false)}>
          <div className="mlf-tactics-card" onClick={(e) => e.stopPropagation()}>
            <div className="mlf-tactics-head">
              <span className="mlf-label team">Tática ao vivo — {sideName}</span>
              <button className="mlf-tactics-close" onClick={() => setTacticsOpen(false)}>✕</button>
            </div>
            {controllable.length > 1 && (
              <div className="mlf-sidesel">
                {controllable.map((s) => (
                  <button key={s} className={`mlf-sidetab ${ctrlSide === s ? "sel" : ""}`} style={{ "--c": colorOf(s) }} onClick={() => setCtrlSide(s)}>
                    {s === "home" ? homeName : awayName}
                  </button>
                ))}
              </div>
            )}
            <TacticsLive side={mySide} tactics={view.tactics} locked={!canControl(mySide)} onApply={applyTactics} sideColor={sideColor} ratings={teamRatings((mySide === "home" ? home : away).squad)} oppPlayers={view.tokens?.[otherSide(mySide)] || []} />
          </div>
        </div>
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
              <p className="ml-ht-text">Ajuste sua tática para o 2º tempo e confirme quando estiver pronto.</p>

              {/* O ⚙ do cockpit fica atrás deste overlay — botão dedicado abre a Tática aqui.
                  Aplicar uma alavanca vale já no 2º tempo (setTactic → recalcula o λ). */}
              {iAmManager && (
                <button className="btn btn-ghost btn-block ml-ht-tactics" onClick={() => setTacticsOpen(true)}>
                  ⚙ Ajustar tática
                </button>
              )}

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

      {pens && !finalResult && (
        <Penalties
          pens={pens} homeName={homeName} awayName={awayName} homeColor={homeColor} awayColor={awayColor}
          homeMgr={homeMgr} awayMgr={awayMgr}
          controllable={controllable} isLocal={isLocal} isHost={controller} canFinish={controller}
          onAim={(v) => penChoose("aim", v)} onGk={(v) => penChoose("gk", v)} onResolve={commitKick}
          onContinue={() => penResultRef.current && finalize(penResultRef.current)}
          onLeave={onLeave}
        />
      )}

      {/* FIM DE PARTIDA (pontos corridos) — resultado + classificação atualizada */}
      {ended && controller && (
        <div className="ml-endmatch">
          <div className="ml-end-card">
            <span className="pen-eyebrow">Fim de jogo</span>
            <div className="ml-end-score">
              <TeamBadge mgr={homeMgr} name={homeName} color={homeColor} />
              <span className="ml-end-team">{homeName}</span>
              <b className="ml-end-num">{view.score[0]}</b>
              <i>—</i>
              <b className="ml-end-num">{view.score[1]}</b>
              <span className="ml-end-team r">{awayName}</span>
              <TeamBadge mgr={awayMgr} name={awayName} color={awayColor} />
            </div>

            {endStandings && (
              <>
                <div className="ml-end-tablelabel">Classificação</div>
                <div className="table ml-end-table">
                  <div className="table-head">
                    <span className="th-pos">#</span><span className="th-team">Time</span>
                    <span>P</span><span>J</span><span>V</span><span>E</span><span>D</span><span>SG</span>
                  </div>
                  {endStandings.map((row, i) => {
                    const pl = players.find((p) => p.id === row.id);
                    const justPlayed = row.id === homeMgr?.id || row.id === awayMgr?.id;
                    return (
                      <div key={row.id} className={`table-row ${justPlayed ? "leader" : ""}`}>
                        <span className="th-pos">{i + 1}</span>
                        <span className="th-team">
                          <Avatar emoji={pl?.emoji} color={pl?.color} size={20} />
                          <span className="tr-name">{pl?.teamName || "—"}</span>
                        </span>
                        <span className="tr-pts">{row.Pts}</span>
                        <span>{row.P}</span><span>{row.W}</span><span>{row.D}</span><span>{row.L}</span>
                        <span>{row.GD > 0 ? "+" + row.GD : row.GD}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <button className="btn btn-primary btn-block btn-lg" onClick={() => finalize(endResultRef.current)}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {/* PÊNALTI EM JOGO — pausa + "PÊNALTI!" + mini-tela (cobrador/goleiro, 4s) */}
      {igPen && (
        <Penalties
          mode="inGame"
          pens={{ ...igPen, turn: igPen.att, score: [0, 0], home: [], away: [], round: 0, done: false }}
          homeName={homeName} awayName={awayName} homeColor={homeColor} awayColor={awayColor}
          homeMgr={homeMgr} awayMgr={awayMgr}
          controllable={controllable} isLocal={isLocal} isHost={controller} canFinish={false}
          onAim={(v) => igPenChoose("aim", v)} onGk={(v) => igPenChoose("gk", v)} onResolve={igPenCommit}
          onLeave={onLeave}
        />
      )}
    </div>
  );
}

// Painel de escalação de um lado: nº, nome, capitão, gols (bolinhas), cartões e energia.
// mirror=true espelha (visitante à direita), igual a uma transmissão.
function LineupPanel({ name, color, formationName, tokens, captainId, goalsBy, mirror }) {
  return (
    <div className={`mlf-lineup ${mirror ? "mirror" : ""}`} style={{ "--c": color }}>
      <div className="mlf-lineup-head">
        <span className="mlf-lineup-name">{name}</span>
        {formationName && <span className="mlf-lineup-form">{formationName}</span>}
      </div>
      <div className="mlf-lineup-list">
        {tokens.map((t) => {
          const goals = goalsBy[t.id] || 0;
          return (
            <div key={t.id} className={`mlf-lp ${t.out ? "out" : ""}`}>
              <span className="mlf-lp-num">{t.num}</span>
              <span className="mlf-lp-body">
                <span className="mlf-lp-nameline">
                  <span className="mlf-lp-name">{lastName(t.name)}</span>
                  {t.id === captainId && <span className="mlf-cap" title="Capitão">C</span>}
                  {goals > 0 && <GoalBalls n={goals} />}
                  {t.out ? (
                    <span className="mlf-card red" title="Expulso" />
                  ) : (t.yellow || 0) >= 1 ? (
                    <span className="mlf-card yellow" title="Cartão amarelo" />
                  ) : null}
                </span>
                <span className="mlf-energy"><i style={{ width: `${t.stamina ?? 100}%`, background: stamColor(t.stamina ?? 100) }} /></span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Bolinhas de gol em frente ao nome (uma por gol; vira "⚽ ×N" a partir de 3).
function GoalBalls({ n }) {
  if (n >= 3) return <span className="mlf-goals" title={`${n} gols`}>⚽<b>×{n}</b></span>;
  return <span className="mlf-goals" title={`${n} gol${n > 1 ? "s" : ""}`}>{"⚽".repeat(n)}</span>;
}

// Congelamento dramático: texto GRANDE e animado o tempo todo ("GOLLLL!"/"VERMELHOOO!")
// sobre a cena CONGELADA (a cena para porque o host não dá step enquanto a cinematic de
// gol/vermelho está ativa; a bola fica na rede pela animação do chute). Some sozinho
// quando a cinematic sai (host limpa ao fim do tempo real). `reduced` (reduce-motion) =
// texto estático, sem pulsar/tremer. `active` = há humano na partida (bot×bot não congela).
function FreezeOverlay({ cine, active, reduced, scorer, homeColor, awayColor, homeName, awayName }) {
  if (!active || !cine) return null;
  const isGoal = cine.type === "shot" && cine.outcome === "goal";
  const isRed = cine.type === "red";
  if (!isGoal && !isRed) return null;
  const color = cine.side === "home" ? homeColor : awayColor;
  const team = cine.side === "home" ? homeName : awayName;
  const big = isGoal ? "GOLLLL!" : "VERMELHOOO!";
  // GOL: o AUTOR creditado vem do evento (scorer), não do chutador da animação (cine.shooter).
  const who = scorer || cine.shooter;
  const sub = isGoal ? `${who ? who + " · " : ""}${team}` : (cine.name || team);
  return (
    <div className={`ml-freeze ${isGoal ? "goal" : "red"}${reduced ? " reduced" : ""}`} key={cine.id} style={{ "--team": color }}>
      <div className="ml-freeze-tint" />
      <div className="ml-freeze-big">{big}</div>
      {sub && <div className="ml-freeze-sub">{sub}</div>}
    </div>
  );
}

// Toca os sons dos lances que o motor JÁ emitiu: apito de início/2º tempo/cartões/fim
// (Tone.js) e o mp3 de gol. `active` = há humano na partida (silêncio em bot×bot; o
// simular-tudo nem renderiza). O módulo de áudio respeita prefs e o unlock por gesto.
function AudioCues({ active, started, lastEvent }) {
  const lastKeyRef = useRef(null);
  const startedRef = useRef(null);
  useEffect(() => { if (active) preloadGoal(); }, [active]);
  // apito de início — só na transição "não começou" → "começou" (não retroativo p/ quem entra no meio)
  useEffect(() => {
    if (startedRef.current === null) { startedRef.current = !!started; return; }
    if (active && started && !startedRef.current) { startedRef.current = true; playWhistle("kickoff"); }
  }, [active, started]);
  // demais eventos: dispara 1× por evento novo (lastEvent muda de assinatura)
  useEffect(() => {
    if (!active || !lastEvent) return;
    const e = lastEvent;
    const key = `${e.minute}|${e.type}|${e.side}|${e.scorer || e.name || e.text || ""}`;
    if (lastKeyRef.current === null) { lastKeyRef.current = key; return; }
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    if (e.type === "goal") playGoal();
    else if (e.type === "yellow") playWhistle("yellow");
    else if (e.type === "red") playWhistle("red");
    else if (e.type === "whistle") {
      const t = (e.text || "").toLowerCase();
      if (t.includes("2º tempo") || t.includes("2o tempo")) playWhistle("halftime");
      else if (t.includes("fim") || t.includes("pênal") || t.includes("penal")) playWhistle("final");
    }
  }, [active, lastEvent]);
  return null;
}

function CineOverlay({ cine, dramatic, scorer, homeName, awayName, homeColor, awayColor }) {
  if (!cine) return null;
  // Com humano em campo, gol/vermelho viram o congelamento dramático (FreezeOverlay);
  // aqui o CineOverlay cuida do resto (defesaça, trave, fora, amarelo, pênalti) e, em
  // bot×bot, ainda mostra o gol/vermelho curtinho.
  if (dramatic && ((cine.type === "shot" && cine.outcome === "goal") || cine.type === "red")) return null;
  const teamColor = cine.side === "home" ? homeColor : awayColor;
  const teamName = cine.side === "home" ? homeName : awayName;
  let big = null, sub = null, cls = "";
  if (cine.type === "shot") {
    if (cine.outcome === "goal") { big = "GOOOL!"; sub = `${scorer || cine.shooter} · ${teamName}`; cls = "goal"; }
    else if (cine.outcome === "save") { big = "DEFESAÇA!"; sub = "Que defesa!"; cls = "save"; }
    else if (cine.outcome === "post") { big = "NA TRAVE!"; cls = "post"; }
    else { big = "PRA FORA!"; cls = "miss"; }
  } else if (cine.type === "penalty") {
    big = cine.outcome === "goal" ? "GOL DE PÊNALTI!" : cine.outcome === "miss" ? "PÊNALTI PRA FORA!" : "PÊNALTI DEFENDIDO!";
    sub = cine.shooter; cls = cine.outcome === "goal" ? "goal" : "save";
  } else if (cine.type === "yellow") { big = "CARTÃO AMARELO"; sub = cine.name; cls = "yellow"; }
  else if (cine.type === "red") { big = "CARTÃO VERMELHO"; sub = /amarelo/i.test(cine.reason || "") ? `${cine.name} · 2º amarelo` : cine.name; cls = "red"; }
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
const ATTACK_FOCUS = [["esq", "Esquerda"], ["meio", "Meio"], ["dir", "Direita"]];

function TacticsLive({ side, tactics, locked, onApply, sideColor, ratings, oppPlayers }) {
  const cur = tactics?.[side] || {};
  const [pending, setPending] = useState(cur);
  // ressincroniza quando troca de lado
  const sideRef = useRef(side);
  if (sideRef.current !== side) { sideRef.current = side; if (pending !== cur) setPending(cur); }

  const dirty = ["posture", "line", "build", "marking", "attackSide", "manMark"].some((k) => pending[k] !== cur[k]);
  function set(k, v) { if (!locked) setPending((p) => ({ ...p, [k]: v })); }
  function applyPreset(p) { if (!locked) setPending((cur2) => ({ ...cur2, posture: p.posture, line: p.line, marking: p.marking, build: p.build })); }
  const build = pending.build ?? 0.4;
  const activePreset = matchingPreset(pending);
  const synergy = computeSynergy(ratings, pending);

  // Bloco E.3 — atalho dos presets salvos do usuário (saved_tactics); preenche as alavancas.
  const [savedPresets, setSavedPresets] = useState([]);
  useEffect(() => { listMyTactics().then(setSavedPresets).catch(() => {}); }, []);
  function applySaved(t) { if (!locked && t) setPending((c) => ({ ...c, ...t })); }

  return (
    <div className="mlf-tactics">
      {/* PRESETS rápidos */}
      <div className="mlf-seg-label">Presets</div>
      <div className="mlf-presets">
        {PRESETS.map((p) => (
          <button key={p.id} className={`mlf-preset ${activePreset?.id === p.id ? "sel" : ""}`} disabled={locked}
            style={activePreset?.id === p.id ? { borderColor: sideColor, color: sideColor } : undefined}
            onClick={() => applyPreset(p)}>{p.name}</button>
        ))}
      </div>
      {/* Bloco E.3 — meus presets salvos (preenchem as alavancas com 1 clique) */}
      {savedPresets.length > 0 && (
        <div className="mlf-saved-presets">
          {savedPresets.map((t) => (
            <button key={t.id} type="button" className={`mlf-saved-preset ${t.is_default ? "is-default" : ""}`} disabled={locked}
              title="Preencher com o preset salvo" onClick={() => applySaved(t.tactics)}>
              ⭐ {t.name}
            </button>
          ))}
        </div>
      )}

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

      <div className="mlf-seg-label mlf-adv-label">Avançado</div>
      <Seg label="Foco de ataque" options={ATTACK_FOCUS} value={pending.attackSide || "meio"} onPick={(v) => set("attackSide", v)} />

      <div className="mlf-seg-block">
        <div className="mlf-seg-label">Marcação individual (anular um craque adversário)</div>
        <div className="mlf-mark-list">
          <button className={`mlf-mark ${!pending.manMark ? "sel" : ""}`} disabled={locked} onClick={() => set("manMark", null)}>Nenhuma</button>
          {(oppPlayers || []).filter((p) => !p.out && p.pos !== "GK").sort((a, b) => b.ovr - a.ovr).slice(0, 8).map((p) => (
            <button key={p.id} className={`mlf-mark ${pending.manMark === p.id ? "sel" : ""}`} disabled={locked} onClick={() => set("manMark", p.id)}>
              {lastName(p.name)} <span className="mlf-mark-ovr">{p.ovr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ENCAIXE estilo × elenco */}
      {synergy.length > 0 && (
        <div className="mlf-synergy">
          <div className="mlf-seg-label">Encaixe com seu elenco</div>
          {synergy.map((s, i) => (
            <div key={i} className={`mlf-fit ${s.level}`}>
              <span className="mlf-fit-ico">{s.level === "good" ? "✓" : s.level === "warn" ? "⚠" : "✕"}</span>
              <span className="mlf-fit-aspect">{s.aspect}</span>
              <span className="mlf-fit-msg">{s.msg}</span>
            </div>
          ))}
        </div>
      )}

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
  // Tally de gols por jogador (todos os eventos), p/ o espectador desenhar as bolinhas.
  const goalsBy = {};
  for (const e of s.events) if (e.type === "goal" && e.scorerId != null) goalsBy[e.scorerId] = (goalsBy[e.scorerId] || 0) + 1;
  const tk = (t) => ({ id: t.id, num: t.num, x: Math.round(t.x * 10) / 10, y: Math.round(t.y * 10) / 10, pos: t.pos, name: t.name, stamina: Math.round(t.stamina), out: t.out, yellow: t.yellow || 0 });
  return {
    minute: s.minute, phase: s.phase, score: s.score, ball: { x: Math.round(s.ball.x * 10) / 10, y: Math.round(s.ball.y * 10) / 10 },
    tokens: { home: s.tokens.home.map(tk), away: s.tokens.away.map(tk) },
    carrier: s.carrier, cinematic: s.cinematic, men: s.men, ready: s.ready,
    started: s.started, preReady: s.preReady,
    penaltyPending: s.penaltyPending ? {
      att: s.penaltyPending.att, def: s.penaltyPending.def, taker: s.penaltyPending.taker, id: s.penaltyPending.id,
      picks: s.penaltyPending.picks, deadline: s.penaltyPending.deadline,
      animating: !!s.penaltyPending.animating, lastKick: s.penaltyPending.lastKick || null,
    } : null,
    lastEvent: s.lastEvent, events: s.events.slice(-14), tactics: s.tactics, subsLeft: s.subsLeft, stats: s.stats, goalsBy,
    mom: momentumFromXg(s.xgTimeline), // momentum p/ o espectador (barra de pressão)
  };
}

function isPenDecided(h, a, score) {
  const hd = h.length, ad = a.length;
  // Morte súbita: os dois já bateram 5+. Só decide ao fim de uma rodada COMPLETA
  // (mesmo número de cobranças) e com placar diferente — assim o adversário
  // sempre tem direito à sua cobrança antes de a disputa acabar.
  if (hd >= 5 && ad >= 5) {
    return hd === ad && score[0] !== score[1];
  }
  // Melhor de 5 (regulamentar): decide quando a vantagem é inalcançável pelas
  // cobranças que ainda restam dentro das 5.
  const remH = 5 - hd, remA = 5 - ad;
  if (score[0] > score[1] + remA) return true;
  if (score[1] > score[0] + remH) return true;
  return false;
}

// Posição-alvo da bola por mira (% dentro do gol) e deslocamento do mergulho do goleiro.
const AIM_POS = { cantoE: { x: 20, y: 26 }, meio: { x: 50, y: 40 }, cantoD: { x: 80, y: 26 } };
const GK_SHIFT = { cantoE: -64, meio: 0, cantoD: 64 };

// Tempos da CENA (puro visual — não muda o resultado, já calculado pela seed).
const PEN_ARM_MS = { shootout: 720, inGame: 950 }; // clima/posicionamento antes de liberar a escolha
const PEN_SET_MS = 720;        // suspense depois que os dois decidem, antes da corrida
const PEN_SHOOT_MS = 1040;     // corrida + voo da bola + mergulho (câmera lenta)
const PEN_RESULT_HOLD_MS = 980; // o veredito "respira" antes de o host avançar o estado
const PEN_RING_C = 289;        // circunferência do anel (r=46): 2π·46

// Texto de aposta da cobrança atual (SÓ disputa; cosmético). As condições espelham
// isPenDecided (inalcançável), então nunca afirmam algo falso na fase regulamentar.
function penStakes(pens) {
  if (!pens || pens.done || pens.animating) return null;
  const { home, away, score, turn } = pens;
  if (home.length >= 5 && away.length >= 5) return { kind: "sd", text: "Morte súbita" };
  const sd = turn === "home" ? home.length : away.length;
  const od = turn === "home" ? away.length : home.length;
  const sScore = turn === "home" ? score[0] : score[1];
  const oScore = turn === "home" ? score[1] : score[0];
  const remSAfter = Math.max(0, 5 - (sd + 1)); // cobranças minhas restantes APÓS esta
  const remO = Math.max(0, 5 - od);            // cobranças do adversário restantes
  if (sScore + 1 > oScore + remO) return { kind: "clinch", text: "Se marcar, classifica ✓" };
  if (oScore > sScore + remSAfter) return { kind: "must", text: "Tem que marcar pra seguir vivo" };
  return null;
}

function Penalties({ pens, homeName, awayName, homeColor, awayColor, homeMgr, awayMgr, controllable, isLocal, isHost, canFinish, onAim, onGk, onResolve, onContinue, onLeave, mode = "shootout" }) {
  const inGame = mode === "inGame";
  const lk = pens.lastKick;
  const [phase, setPhase] = useState("idle"); // idle | set | shoot | result (só durante animação)
  const [, setClock] = useState(0); // re-render p/ anel/contagem
  const TIMER_MS = inGame ? IG_PEN_TIMER_MS : PEN_TIMER_MS;
  const ARM_MS = inGame ? PEN_ARM_MS.inGame : PEN_ARM_MS.shootout;
  // Relógios DESTE aparelho (host e cliente), zerados a cada cobrança — imunes à diferença
  // de horário entre máquinas (corrige o bug do "226s"). O clima (arming) atrasa a liberação
  // da escolha e o início do anel; nada disso toca a lógica nem o prazo do motor.
  const dlRef = useRef({ key: null, at: 0 });
  const armRef = useRef({ key: null, until: 0 });
  const resolvedRef = useRef(null); // garante 1 onResolve por cobrança (host)
  const dlKey = inGame ? pens.id : pens.round;
  if (!pens.done && !pens.animating && armRef.current.key !== dlKey) {
    const now = Date.now();
    armRef.current = { key: dlKey, until: now + ARM_MS };
    dlRef.current = { key: dlKey, at: now + ARM_MS + TIMER_MS };
  }

  // Host: avança o estado UMA vez por cobrança (idempotente p/ skip + timeout).
  const doResolve = () => {
    if (!isHost || !onResolve) return;
    if (resolvedRef.current === (lk?.id ?? "none")) return;
    resolvedRef.current = lk?.id ?? "none";
    onResolve();
  };

  // Anima quando chega um novo lance: suspense → corrida/voo (câmera lenta) → veredito.
  // O host avança o estado só depois do veredito respirar (PEN_RESULT_HOLD_MS).
  useEffect(() => {
    if (!pens.animating || !lk) { setPhase("idle"); return; }
    setPhase("set");
    const t1 = setTimeout(() => setPhase("shoot"), PEN_SET_MS);
    const t2 = setTimeout(() => setPhase("result"), PEN_SET_MS + PEN_SHOOT_MS);
    const t3 = isHost ? setTimeout(doResolve, PEN_SET_MS + PEN_SHOOT_MS + PEN_RESULT_HOLD_MS) : null;
    return () => { clearTimeout(t1); clearTimeout(t2); if (t3) clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lk?.id, pens.animating]);

  // Tique do anel/contagem enquanto se escolhe (e durante o clima).
  useEffect(() => {
    if (pens.done || pens.animating) return;
    const id = setInterval(() => setClock((n) => n + 1), 100);
    return () => clearInterval(id);
  }, [pens.done, pens.animating, pens.round, pens.id]);

  const now = Date.now();
  const shooting = pens.turn;
  const goalie = shooting === "home" ? "away" : "home";
  const shooterColor = shooting === "home" ? homeColor : awayColor;
  const shootingTeamName = shooting === "home" ? homeName : awayName;
  const shootingMgr = shooting === "home" ? homeMgr : awayMgr;
  // desfecho (gol/defesa/fora). Fallback p/ a disputa (sem outcome): scored? gol : defesa.
  const outcome = lk?.outcome || (lk ? (lk.scored ? "goal" : "save") : "goal");
  const target = !lk ? AIM_POS.meio
    : outcome === "miss"
      ? { x: lk.aim === "cantoE" ? 3 : lk.aim === "cantoD" ? 97 : 50, y: lk.aim === "meio" ? 2 : 6 }
      : AIM_POS[lk.aim];
  const gkShift = lk ? GK_SHIFT[lk.gkDir] : 0;
  const kicking = phase === "shoot" || phase === "result"; // bola/cobrador/goleiro em movimento
  const showResult = phase === "result" && lk;

  const choosing = !pens.done && !pens.animating;
  const armed = choosing && now >= armRef.current.until;
  const arming = choosing && !armed; // clima de pressão antes de liberar a escolha

  // lados que ESTE aparelho controla nesta cobrança
  const iShoot = (controllable || []).includes(shooting);
  const iGoalie = (controllable || []).includes(goalie);
  const aimLocked = pens.picks?.aim != null; // batedor já travou (NÃO revela o lado)
  const gkLocked = pens.picks?.gk != null;   // goleiro já travou (NÃO revela o lado)
  const needAim = iShoot && !aimLocked;
  const needGk = iGoalie && !gkLocked;

  // anel: fração do tempo restante (0..1); urgente nos últimos 2s
  const remainMs = Math.max(0, dlRef.current.at - now);
  const remain = choosing ? Math.max(0, Math.ceil(remainMs / 1000)) : null;
  const frac = choosing ? Math.max(0, Math.min(1, remainMs / TIMER_MS)) : 1;
  const urgent = choosing && armed && remainMs <= 2000;

  const statusLine =
    aimLocked && gkLocked ? "Os dois confirmaram — vai a cobrança!" :
    aimLocked ? "Batedor confirmou ✓ · esperando o goleiro…" :
    gkLocked ? "Goleiro confirmou ✓ · esperando o batedor…" :
    "Esperando as duas escolhas…";

  const stakes = inGame ? null : penStakes(pens);

  const dots = (arr, n = 5) => {
    const out = [];
    for (let i = 0; i < Math.max(n, arr.length); i++) out.push(i < arr.length ? (arr[i] ? "scored" : "missed") : "pending");
    return out;
  };

  const skipAnim = () => { setPhase("result"); doResolve(); };

  const AIM_BTNS = [["cantoE", "↖", "Esquerda"], ["meio", "⬆", "Meio"], ["cantoD", "↗", "Direita"]];
  const GK_BTNS = [["cantoE", "🧤", "Pular ←"], ["meio", "🧤", "Centro"], ["cantoD", "🧤", "Pular →"]];

  return (
    <div className={`pen-overlay ${arming ? "arming" : ""}`}>
      <div className={`pen-card ${inGame ? "ingame" : ""} ${showResult ? "v-" + outcome : ""}`}>
        {showResult && outcome === "goal" && <div className="pen-cardflash" />}

        <div className={`pen-title ${inGame ? "ingame" : ""} ${inGame && arming ? "impact" : ""}`}>
          {inGame ? "PÊNALTI!" : "DISPUTA DE PÊNALTIS"}
        </div>

        {/* PLACAR REAL — escudo + nome dos dois lados, sem "ST/B1" */}
        {!inGame && (
          <div className="pen-board">
            {["home", "away"].map((side) => {
              const arr = side === "home" ? pens.home : pens.away;
              const nm = side === "home" ? homeName : awayName;
              const col = side === "home" ? homeColor : awayColor;
              const mgr = side === "home" ? homeMgr : awayMgr;
              const sc = side === "home" ? pens.score[0] : pens.score[1];
              const isTurn = choosing && shooting === side;
              return (
                <div key={side} className={`pen-team ${isTurn ? "turn" : ""}`} style={{ "--c": col }}>
                  <TeamBadge mgr={mgr} name={nm} color={col} />
                  <span className="pen-team-name">{nm}</span>
                  <div className="pen-dots">
                    {dots(arr).map((d, i) => (
                      <span
                        key={`${i}-${d}`}
                        className={`pen-dot ${d} ${isTurn && i === arr.length ? "current" : ""} ${i === arr.length - 1 && d !== "pending" ? "pop" : ""}`}
                      >{d === "scored" ? "✓" : d === "missed" ? "✗" : ""}</span>
                    ))}
                  </div>
                  <b className="pen-team-score">{sc}</b>
                </div>
              );
            })}
            {stakes && <div className={`pen-stakes ${stakes.kind}`}>{stakes.text}</div>}
          </div>
        )}

        {/* CENA ANIMADA */}
        <div className={`pen-scene ${arming ? "arming" : ""} ${phase === "set" ? "suspense" : ""} ${phase === "shoot" ? "slowmo" : ""}`}>
          <div className="pen-grass" />
          <div className="pen-goalframe">
            <span className="pen-post l" /><span className="pen-post r" /><span className="pen-bar" />
            <span className={`pen-mesh ${showResult && outcome === "goal" ? "shake" : ""}`} />
          </div>
          <div
            key={"gk" + (lk?.id || 0)}
            className={`pen-keeper ${kicking ? "dive" : ""}`}
            style={{ "--gx": gkShift + "px", "--gr": (gkShift < 0 ? -22 : gkShift > 0 ? 22 : 0) + "deg" }}
          >
            <span className="pen-kp-arm la" /><span className="pen-kp-arm ra" />
            <span className="pen-kp-head" /><span className="pen-kp-body" />
          </div>
          <div
            key={"ball" + (lk?.id || 0)}
            className={`pen-ball2 ${kicking ? "shot" : ""}`}
            style={{ "--tx": target.x + "%", "--ty": target.y + "%" }}
          />
          <div key={"kik" + (lk?.id || 0)} className={`pen-kicker ${kicking ? "kick" : ""}`}>
            <span className="pen-kk-head" /><span className="pen-kk-body" style={{ background: shooterColor }} /><span className="pen-kk-leg" />
          </div>

          {showResult ? (
            <div className={`pen-flash ${outcome}`}>{outcome === "goal" ? "GOL!" : outcome === "save" ? "DEFENDEU!" : "PRA FORA!"}</div>
          ) : phase === "set" ? (
            <div className="pen-shooting suspense">Respira…</div>
          ) : choosing ? (
            <div className="pen-shooting">
              Cobra: <TeamBadge mgr={shootingMgr} name={shootingTeamName} color={shooterColor} />
              <b style={{ color: shooterColor }}>{shootingTeamName}</b>
            </div>
          ) : (
            <div className="pen-shooting">Cobrança…</div>
          )}
        </div>

        {/* DECISÃO — papéis, anel, selos, botões grandes */}
        {choosing && (
          <div className="pen-decide">
            <div className="pen-roles">
              {iShoot && <span className="pen-role shoot">⚽ Você cobra</span>}
              {iGoalie && <span className="pen-role defend">🧤 Você defende</span>}
              {!iShoot && !iGoalie && <span className="pen-role watch">👁 Assistindo</span>}
            </div>

            {/* anel que esvazia ao redor da bola (em vez de um número solto) */}
            <div className={`pen-ringwrap ${urgent ? "urgent" : ""}`}>
              <svg className="pen-ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle className="pen-ring-bg" cx="50" cy="50" r="46" />
                <circle
                  className="pen-ring-fg" cx="50" cy="50" r="46"
                  style={{ strokeDasharray: PEN_RING_C, strokeDashoffset: PEN_RING_C * (1 - frac) }}
                />
              </svg>
              <span className="pen-ring-ball">⚽</span>
              {armed && <span className="pen-ring-num">{remain}</span>}
            </div>

            {/* dois selos: BATEDOR e GOLEIRO — acendem com ✓ ao travar (sem revelar o lado) */}
            <div className="pen-seals">
              <div className={`pen-seal ${aimLocked ? "locked" : ""} ${iShoot ? "mine" : ""}`} key={"sa" + aimLocked}>
                <span className="pen-seal-icon">{aimLocked ? "✓" : "⚽"}</span>
                <span className="pen-seal-role">Batedor</span>
                <span className="pen-seal-state">{aimLocked ? "Pronto" : "Escolhendo…"}</span>
              </div>
              <div className={`pen-seal ${gkLocked ? "locked" : ""} ${iGoalie ? "mine" : ""}`} key={"sg" + gkLocked}>
                <span className="pen-seal-icon">{gkLocked ? "✓" : "🧤"}</span>
                <span className="pen-seal-role">Goleiro</span>
                <span className="pen-seal-state">{gkLocked ? "Pronto" : "Escolhendo…"}</span>
              </div>
            </div>
            <div className="pen-statusline">{statusLine}</div>

            {arming ? (
              <div className="pen-armmsg">Na marca do pênalti…</div>
            ) : (
              <>
                {needAim && (
                  <div className="pen-pickrow">
                    {AIM_BTNS.map(([k, ic, l]) => (
                      <button key={k} className="pen-pick shoot" onClick={() => onAim(k)}>
                        <span className="pen-pick-ic">{ic}</span><span className="pen-pick-l">{l}</span>
                      </button>
                    ))}
                  </div>
                )}
                {needGk && (
                  <div className="pen-pickrow def">
                    {GK_BTNS.map(([k, ic, l]) => (
                      <button key={k} className="pen-pick defend" onClick={() => onGk(k)}>
                        <span className="pen-pick-ic">{ic}</span><span className="pen-pick-l">{l}</span>
                      </button>
                    ))}
                  </div>
                )}
                {!needAim && !needGk && (
                  <div className="pen-youready">
                    {(controllable?.length === 0)
                      ? "Os técnicos estão decidindo…"
                      : "Sua escolha está travada ✓ — segura o coração…"}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* válvula de saída: se travou (host caiu durante o pênalti em jogo), permite sair.
            Usa o relógio LOCAL (dlRef, armado quando este aparelho vê a cobrança) e não o
            prazo do host — imune à diferença de horário entre máquinas (mesma classe do "226s"). */}
        {inGame && !isHost && !pens.animating && dlRef.current.key === dlKey && now > dlRef.current.at + 6000 && onLeave && (
          <div className="pen-actions">
            <div className="pen-elim">Conexão com o anfitrião perdida.</div>
            <button className="pen-btn ghost" onClick={onLeave}>Sair pro Lobby</button>
          </div>
        )}

        {pens.animating && (
          <button className="pen-skip" onClick={skipAnim}>Pular animação ⏭</button>
        )}

        {pens.done && (() => {
          const penWinner = pens.score[0] > pens.score[1] ? "home" : "away";
          const winnerName = penWinner === "home" ? homeName : awayName;
          const winnerColor = penWinner === "home" ? homeColor : awayColor;
          const winnerMgr = penWinner === "home" ? homeMgr : awayMgr;
          const iWon = isLocal || controllable?.includes(penWinner);
          return (
            <>
              <div className="pen-done">Decidido nos pênaltis!</div>
              <div className="pen-winner" style={{ color: winnerColor }}>
                <TeamBadge mgr={winnerMgr} name={winnerName} color={winnerColor} />
                <span>{winnerName} vence!</span>
              </div>
              <div className="pen-actions">
                {isLocal ? (
                  <button className="pen-btn" onClick={onContinue}>Continuar para a próxima partida →</button>
                ) : iWon ? (
                  canFinish
                    ? <button className="pen-btn" onClick={onContinue}>Continuar para a próxima partida →</button>
                    : <div className="pen-wait">Aguardando a próxima partida…</div>
                ) : (
                  <>
                    <div className="pen-elim">Você foi eliminado</div>
                    {canFinish && (
                      <button className="pen-btn" onClick={onContinue}>Avançar torneio (espectador)</button>
                    )}
                    {onLeave && (
                      <button className="pen-btn ghost" onClick={onLeave}>Sair pro Lobby</button>
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
