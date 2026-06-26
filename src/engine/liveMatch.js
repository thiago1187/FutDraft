// Motor de partida AO VIVO — simulação de futebol por POSSE de bola.
// Fluxo contínuo (portador conduz, passa, é pressionado) + momentos cinematográficos
// (chute com trajetória → gol/defesa/fora/trave, pênalti, cartões). Roda no host; o
// `state` é serializado em snapshots para os clientes. `result()` mantém o formato antigo.
//
// Campo: x = comprimento 0..100 (casa ataca p/ x=100, visitante p/ x=0), y = largura 0..100.
// Gol da casa em x=0; gol do visitante em x=100. Boca do gol: y ∈ [38,62].

import { teamRatings } from "./match.js";
import { computeLambdas, effOvr } from "./rates.js";

const MATCH_MS_1X = 110000; // 90' em ~110s a 1× (~1,2s por minuto) — dá pra acompanhar
const HALF = 45;
const SIM_STEP = 450; // ms (escalados) entre decisões — jogadas mais deliberadas/visíveis

// Ruído gaussiano (Box-Muller) p/ o "choque de forma" por partida.
function randn() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1) => Math.random() * a;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function jersey(p, i) {
  if (p.pos === "GK") return 1;
  return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11][i % 10] || i + 1;
}

function basePositions(team, side) {
  const slots = team.lineup?.formation?.slots || [];
  return team.squad.map((p, i) => {
    const slot = slots[i] || { x: 50, y: 50 };
    const depth = slot.y; // 0..100 (0 = própria defesa)
    const bx = side === "home" ? 4 + depth * 0.46 : 96 - depth * 0.46;
    const by = clamp(slot.x, 8, 92);
    return { id: p.id, num: jersey(p, i), name: p.name, pos: p.pos, detail: p.detail, ovr: p.ovr, flag: p.flag,
      bx, by, x: bx, y: by, tx: bx, ty: by, stamina: 100, out: false };
  });
}

const TACTIC_DEFAULT = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4 };

export function createLiveMatch(home, away, opts = {}) {
  const knockout = !!opts.knockout;
  const cpu = opts.cpu || { home: false, away: false };
  const rh = teamRatings(home.squad);
  const ra = teamRatings(away.squad);

  const state = {
    home: { id: home.id, name: home.name, color: opts.homeColor || "#E94E27" },
    away: { id: away.id, name: away.name, color: opts.awayColor || "#2B5BA8" },
    minute: 0,
    phase: "1T", // 1T | INT | 2T | FIM | PEN
    score: [0, 0],
    possession: Math.random() < 0.5 ? "home" : "away",
    ball: { x: 50, y: 50 },
    carrier: null, // { side, idx }
    pass: null, // passe em curso { toIdx, t, dur, fx, fy }
    tokens: { home: basePositions(home, "home"), away: basePositions(away, "away") },
    bench: { home: home.bench || [], away: away.bench || [] },
    tactics: { home: { ...TACTIC_DEFAULT }, away: { ...TACTIC_DEFAULT } },
    subsLeft: { home: 5, away: 5 },
    men: { home: 11, away: 11 },
    cards: { home: [], away: [] },
    events: [],
    lastEvent: null,
    cinematic: null,
    penaltyPending: null, // pênalti EM JOGO aguardando cobrança (resolvido pela UI); { att, def, taker, picks, deadline, animating, lastKick, id }
    stats: { possession: [0, 0], shots: [0, 0], onTarget: [0, 0], corners: [0, 0], fouls: [0, 0] },
    ready: { home: !!cpu.home, away: !!cpu.away },
    momentum: 0,
    xg: [0, 0],
    xgTimeline: [{ m: 0, h: 0, a: 0 }], // corrida de xG (em escada a cada finalização)
    paused: false,
    over: false,
    ratings: { home: rh, away: ra },
    // choque de forma por partida (média 1, σ pequeno) — dá zebra sem injustiça
    form: { home: Math.exp(randn() * 0.13), away: Math.exp(randn() * 0.13) },
    lam: { home: 1.3, away: 1.3 },
  };
  state.lam = computeLambdas(state);

  let elapsed = 0;
  let simAccum = 0;
  let cineId = 0;
  let penSeq = 0; // id monotônico de cada pênalti em jogo (não reusa após resolver)
  let halftimeHeld = false;

  // ---------- helpers de domínio ----------
  const other = (s) => (s === "home" ? "away" : "home");
  const idx = (s) => (s === "home" ? 0 : 1);
  const attGoalX = (s) => (s === "home" ? 100 : 0);
  const ownGoalX = (s) => (s === "home" ? 0 : 100);
  const ballProgress = (s) => (s === "home" ? state.ball.x / 100 : (100 - state.ball.x) / 100);
  const tk = (s, i) => state.tokens[s][i];

  function effOvr(t) {
    return t.ovr * (0.72 + 0.28 * (t.stamina / 100));
  }
  function gkOf(s) {
    return state.tokens[s].find((t) => t.pos === "GK" && !t.out);
  }
  function gkRating(s) {
    const g = gkOf(s);
    return g ? effOvr(g) : (s === "home" ? rh.G : ra.G) - 8;
  }
  function postureMult(s) {
    const p = state.tactics[s].posture;
    return p === "ofensivo" ? 1.34 : p === "defensivo" ? 0.7 : 1;
  }

  function emit(type, side, extra = {}) {
    const ev = { minute: state.minute, type, side, ...extra };
    state.events.push(ev);
    state.lastEvent = ev;
    return ev;
  }
  function setCinematic(c) {
    cineId++;
    state.cinematic = { id: cineId, ...c };
  }

  // ---------- posicionamento: MANTÉM A FORMAÇÃO (bloco), não corre reto pro gol ----------
  function updateTargets() {
    const poss = state.possession;
    const bp = ballProgress(poss); // quão avançada está a bola do time com posse (0..1)
    for (const side of ["home", "away"]) {
      const attacking = side === poss;
      const dir = side === "home" ? 1 : -1;
      const t = state.tactics[side];
      const pm = postureMult(side);
      const lineFrac = t.line === "alta" ? 0.58 : t.line === "baixa" ? 0.3 : 0.44;
      state.tokens[side].forEach((p, i) => {
        if (p.out) return;
        if (p.pos === "GK") {
          p.tx = ownGoalX(side) + dir * 4;
          p.ty = clamp(50 + (state.ball.y - 50) * 0.3, 34, 66);
          return;
        }
        let tx, ty;
        if (attacking) {
          // o BLOCO sobe conforme a bola avança; cada um mantém sua função
          const roleAdv = p.pos === "DEF" ? 0.35 : p.pos === "MID" ? 0.72 : 1.05;
          tx = p.bx + dir * (12 + bp * 38) * pm * roleAdv * 0.55 + (p.dribbleX || 0);
          ty = lerp(p.by, state.ball.y, p.pos === "DEF" ? 0.08 : p.pos === "MID" ? 0.2 : 0.3);
        } else {
          // bloco defensivo: linha + recuo conforme a bola se aproxima
          const lineX = lerp(ownGoalX(side), ownGoalX(side) + dir * 55, lineFrac);
          const threat = side === "home" ? (100 - state.ball.x) / 100 : state.ball.x / 100;
          const drop = clamp(1 - threat, 0, 1);
          const depthW = p.pos === "DEF" ? 0 : p.pos === "MID" ? 0.45 : 0.8;
          const restX = lerp(lineX, lerp(ownGoalX(side), attGoalX(side), 0.5), depthW);
          tx = lerp(restX, ownGoalX(side) + dir * 10, drop * 0.5);
          ty = lerp(p.by, state.ball.y, 0.12);
        }
        p.tx = clamp(tx + jit(i, 0), 6, 94);
        p.ty = clamp(ty + jit(i, 1), 8, 92);
        if (p.dribbleX) p.dribbleX *= 0.9; // o drible decai (não acumula reto)
      });
    }
    // o marcador mais próximo persegue o portador
    const c = state.carrier && tk(poss, state.carrier.idx);
    if (c && !c.out) {
      const presser = nearestDefender(c);
      if (presser) {
        const k = state.tactics[other(poss)].marking === "pressao" ? 0.55 : 0.4;
        presser.tx = lerp(presser.tx, c.x, k);
        presser.ty = lerp(presser.ty, c.y, k);
      }
    }
  }
  function jit(i, axis) {
    return Math.sin((i + 1) * (axis ? 8.71 : 12.99) + state.minute * 0.6 + axis * 2.1) * 2.4;
  }
  // "Espaço" do jogador = distância ao marcador mais próximo (maior = mais livre).
  function openness(poss, p) {
    const opp = other(poss);
    let m = 99;
    for (const o of state.tokens[opp]) { if (o.out) continue; const d = dist(o, p); if (d < m) m = d; }
    return clamp(m, 0, 30);
  }
  function nearestDefender(carrierTok) {
    const def = other(state.possession);
    let best = null, bd = 1e9;
    for (const p of state.tokens[def]) {
      if (p.out || p.pos === "GK") continue;
      const d = dist(p, carrierTok);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }

  function ensureCarrier() {
    const poss = state.possession;
    const arr = state.tokens[poss].filter((p) => !p.out && p.pos !== "GK");
    if (!state.carrier || tk(poss, state.carrier.idx)?.out || state.carrier.side !== poss) {
      // escolhe o mais avançado perto da bola
      let best = 0, bs = -1e9;
      state.tokens[poss].forEach((p, i) => {
        if (p.out || p.pos === "GK") return;
        const fwd = poss === "home" ? p.x : 100 - p.x;
        const score = fwd - dist(p, state.ball) * 0.6;
        if (score > bs) { bs = score; best = i; }
      });
      state.carrier = { side: poss, idx: best };
    }
    void arr;
  }

  // ---------- movimento suave (todo frame) ----------
  function moveTokens(dt) {
    const k = clamp(dt / 700, 0.02, 0.5);
    for (const side of ["home", "away"]) {
      state.tokens[side].forEach((p) => {
        if (p.out) return;
        const sk = p.stamina < 55 ? k * 0.85 : k;
        p.x = lerp(p.x, p.tx, sk);
        p.y = lerp(p.y, p.ty, sk);
      });
    }
    if (state.cinematic) return;

    if (state.pass) {
      // PASSE em curso: a bola viaja do ponto de origem até o recebedor (visível)
      const recv = tk(state.possession, state.pass.toIdx);
      if (!recv || recv.out) { state.pass = null; }
      else {
        state.pass.t += (dt / state.pass.dur);
        const e = 1 - Math.pow(1 - clamp(state.pass.t, 0, 1), 2); // ease-out
        state.ball.x = lerp(state.pass.fx, recv.x, e);
        state.ball.y = lerp(state.pass.fy, recv.y, e);
        if (state.pass.t >= 1) { state.carrier = { side: state.possession, idx: state.pass.toIdx }; state.pass = null; }
      }
    } else {
      // CONDUÇÃO: a bola fica no pé do portador
      const c = state.carrier && tk(state.possession, state.carrier.idx);
      if (c && !c.out) {
        state.ball.x = lerp(state.ball.x, c.x, k * 3);
        state.ball.y = lerp(state.ball.y, c.y, k * 3);
      }
    }
  }

  // ---------- decisões de jogo ----------
  function simTick() {
    if (state.cinematic || state.pass || state.penaltyPending) return; // espera o passe/pênalti
    const poss = state.possession;
    const opp = other(poss);
    ensureCarrier();
    const c = tk(poss, state.carrier.idx);
    if (!c) return;
    const t = state.tactics;
    const presser = nearestDefender(c);
    const pd = presser ? dist(presser, c) : 50;
    const bp = ballProgress(poss);

    state.stats.possession[idx(poss)]++;
    state.momentum = clamp(state.momentum + (poss === "home" ? 0.05 : -0.05), -1, 1);

    // roubo de bola (pressão + qualidade do desarme vs condução)
    const pressInt = t[opp].marking === "pressao" ? 1.5 : 1;
    const tackler = presser ? effOvr(presser) : 65;
    const drib = effOvr(c);
    let loseP = clamp(0.05 * pressInt * (pd < 11 ? 2.1 : pd < 20 ? 1.2 : 0.6) + (tackler - drib) / 300, 0.01, 0.26);
    if (rnd() < loseP) {
      // chance de falta do defensor ao desarmar (mais com pressão alta)
      if (rnd() < (t[opp].marking === "pressao" ? 0.58 : 0.42)) return doFoul(opp, c, bp, presser);
      turnover(opp, "tackle");
      return;
    }

    // finalização no terço final
    if (bp > 0.72) {
      const freq = (0.24 + (bp - 0.72) * 1.1) * postureMult(poss) * (0.85 + t[poss].build * 0.4);
      if (rnd() < clamp(freq, 0, 0.7)) return doShot(poss, c, bp);
    }
    // chute de fora no estilo "direto"
    if (bp > 0.5 && rnd() < 0.09 * t[poss].build) return doShot(poss, c, bp);

    // progride: passe para companheiro mais à frente, ou conduz
    advanceBall(poss);
  }

  function advanceBall(poss) {
    const c = tk(poss, state.carrier.idx);
    const dir = poss === "home" ? 1 : -1;
    const direct = state.tactics[poss].build; // 0 toque .. 1 direto

    // às vezes conduz (drible curto) em vez de passar
    if (rnd() < 0.22 - direct * 0.08) {
      c.dribbleX = clamp((c.dribbleX || 0) + dir * 7, -16, 16);
      return;
    }

    // pontua opções de passe: avançar pesa, mas espaço (jogador livre) pesa mais
    const opts = state.tokens[poss]
      .map((p, i) => ({ p, i }))
      .filter(({ p, i }) => !p.out && p.pos !== "GK" && i !== state.carrier.idx && dist(p, c) < 46)
      .map(({ p, i }) => {
        const forward = poss === "home" ? p.x - c.x : c.x - p.x; // >0 = mais à frente
        const open = openness(poss, p);
        const s = forward * (0.45 + direct * 0.4) + open * 1.3 - Math.max(0, dist(p, c) - 32) * 0.5 + (rnd() * 2 - 1) * 7;
        return { i, p, s };
      })
      .sort((a, b) => b.s - a.s);

    if (!opts.length) { c.dribbleX = clamp((c.dribbleX || 0) + dir * 6, -16, 16); return; }

    // direto = escolhe entre as 2 melhores (mais vertical); toque = entre as 3
    const pick = opts[Math.floor(rnd() * Math.min(opts.length, direct > 0.6 ? 2 : 3))];

    // interceptação no passe (linha alta adversária ajuda)
    if (rnd() < 0.05 + (state.tactics[other(poss)].line === "alta" ? 0.05 : 0)) {
      turnover(other(poss), "intercept");
      return;
    }

    // inicia o passe: a bola VIAJA do ponto atual até o recebedor
    const len = dist(c, pick.p);
    state.pass = { toIdx: pick.i, t: 0, dur: 240 + len * 7, fx: state.ball.x, fy: state.ball.y };
  }

  function turnover(toSide, kind) {
    state.possession = toSide;
    state.carrier = null; state.pass = null;
    state.momentum = clamp(state.momentum + (toSide === "home" ? 0.12 : -0.12), -1, 1);
    if (kind === "tackle" && rnd() < 0.16) {
      state.stats.corners[idx(other(toSide))]++;
      emit("corner", other(toSide));
    }
  }

  // Sorteia quem leva o cartão, com peso forte p/ zagueiros e meios (faltas táticas).
  // Se o autor real da falta for de linha e não-atacante, ele tem prioridade.
  function cardOffender(side, fouler) {
    const field = state.tokens[side].filter((p) => !p.out && p.pos !== "GK");
    if (!field.length) return null;
    if (fouler && !fouler.out && fouler.pos !== "GK" && fouler.pos !== "ATT" && rnd() < 0.7) return fouler;
    const w = field.map((p) => (p.pos === "DEF" ? 1.0 : p.pos === "MID" ? 0.55 : 0.12));
    let r = rnd(w.reduce((s, x) => s + x, 0));
    for (let i = 0; i < field.length; i++) { r -= w[i]; if (r <= 0) return field[i]; }
    return field[0];
  }

  function doFoul(byside, victim, bp, fouler) {
    state.stats.fouls[idx(byside)]++;
    const att = other(byside);
    // pênalti se a falta foi perto da área do infrator
    const nearBox = bp > 0.80 && rnd() < 0.22;
    // quem leva o cartão: tende a ser zagueiro/meio (faltas táticas). Atacante quase
    // nunca — usa o autor real só se ele NÃO for atacante; senão sorteia DEF/MID.
    const off = cardOffender(byside, fouler);
    const r = rnd();
    const pressao = state.tactics[byside].marking === "pressao";
    if (off && r < (pressao ? 0.020 : 0.011)) {
      doRedCard(byside, off, "Cartão vermelho"); // vermelho direto
    } else if (off && r < (pressao ? 0.58 : 0.45)) {
      off.yellow = (off.yellow || 0) + 1;
      if (off.yellow >= 2) {
        // SEGUNDO amarelo → expulso
        emit("yellow", byside, { name: off.name, second: true });
        doRedCard(byside, off, "2º amarelo → expulso");
      } else {
        emit("yellow", byside, { name: off.name });
        setCinematic({ type: "yellow", side: byside, name: off.name, holdMs: 650 });
      }
    }
    if (nearBox) { doPenalty(att); return; }
    // falta comum: posse do atacante onde estava
    state.possession = att;
    state.carrier = null; state.pass = null;
  }

  // Expulsa um jogador (vermelho direto, 2º amarelo, ou — sem alvo — escolhe um zagueiro).
  function doRedCard(side, player, reason) {
    let victim = player && !player.out && player.pos !== "GK" ? player : null;
    if (!victim) {
      const cand = state.tokens[side].filter((p) => !p.out && p.pos !== "GK");
      if (!cand.length) return;
      victim = cand.sort((a, b) => (a.pos === "DEF" ? -1 : 1) - (b.pos === "DEF" ? -1 : 1))[0] || cand[0];
    }
    if (victim.out) return; // já expulso
    victim.out = true;
    state.men[side]--;
    state.cards[side].push("red");
    emit("red", side, { name: victim.name, reason: reason || "Cartão vermelho" });
    setCinematic({ type: "red", side, name: victim.name, reason: reason || "Cartão vermelho", holdMs: 1500 });
    recalcLam();
  }

  // Marca um pênalti EM JOGO: NÃO resolve sozinho — congela o jogo e aguarda a cobrança
  // pela UI (cobrador escolhe o canto, goleiro o mergulho; timer 4s). A resolução vem
  // por resolvePenalty(). A UI (host) preenche picks/deadline dentro de penaltyPending.
  function doPenalty(att) {
    state.stats.shots[idx(att)]++;
    const taker = pickScorer(att);
    const gk = gkRating(other(att));
    // prob = qualidade do batedor vs goleiro → modula o desfecho (além do duelo de cantos)
    const prob = clamp(0.78 + (effOvr(taker) - gk) / 240, 0.6, 0.92);
    state.penaltyPending = {
      att, def: other(att),
      taker: { id: taker.id, name: taker.name }, prob,
      picks: { aim: null, gk: null }, deadline: 0, animating: false, lastKick: null,
      id: ++penSeq,
    };
    state.carrier = null; state.pass = null;
  }

  // Resolve o pênalti em jogo a partir das escolhas (aim = canto do cobrador,
  // gkDir = mergulho do goleiro). scored = o goleiro NÃO acertou o canto. Aplica
  // gol/erro, cria a cinemática de pênalti e LIBERA o relógio (zera penaltyPending).
  function resolvePenalty(scored, aim, gkDir) {
    const pp = state.penaltyPending;
    if (!pp) return false;
    const { att, taker } = pp;
    const aimY = aim === "cantoE" ? 32 : aim === "cantoD" ? 68 : 50;
    const dir = gkDir === "cantoE" ? -1 : gkDir === "cantoD" ? 1 : 0;
    if (scored) {
      state.score[idx(att)]++; state.stats.onTarget[idx(att)]++;
      emit("goal", att, { scorer: taker.name, scorerId: taker.id, score: [...state.score], pen: true });
    } else {
      emit("save", att, { pen: true });
    }
    setCinematic({ type: "penalty", side: att, shooter: taker.name, aimY, gkDir: dir, outcome: scored ? "goal" : "save", holdMs: scored ? 2400 : 2000 });
    state.possession = other(att);
    state.carrier = null; state.pass = null;
    state.penaltyPending = null;
    return true;
  }

  function pickScorer(side) {
    const team = state.tokens[side].filter((p) => !p.out);
    const w = team.map((p) => (p.pos === "ATT" ? effOvr(p) ** 2 * 0.02 : p.pos === "MID" ? effOvr(p) * 0.9 : p.pos === "DEF" ? effOvr(p) * 0.12 : 0.01));
    const tot = w.reduce((s, x) => s + x, 0) || 1;
    let r = rnd(tot);
    for (let i = 0; i < team.length; i++) { r -= w[i]; if (r <= 0) return team[i]; }
    return team[team.length - 1];
  }

  // ---------- λ (taxas de gol) e gols por processo de Poisson ----------
  function recalcLam() {
    state.lam = computeLambdas(state);
  }
  // Grava um ponto na corrida de xG (escada) — chamado a cada finalização.
  function logXg() {
    state.xgTimeline.push({ m: state.minute, h: Math.round(state.xg[0] * 100) / 100, a: Math.round(state.xg[1] * 100) / 100 });
  }

  // A cada MINUTO de jogo: recalcula λ (placar/fadiga/cartões), desgasta e SORTEIA gols.
  // Os gols são um processo de Poisson com taxa λ/90 — assim cada overall e cada decisão
  // de tática mudam de verdade a expectativa de gols (e a chance de vitória).
  function minuteTick() {
    recalcLam();
    for (const side of ["home", "away"]) {
      const drain = state.tactics[side].marking === "pressao" ? 0.5 : 0.32;
      state.tokens[side].forEach((p) => { if (!p.out) p.stamina = clamp(p.stamina - drain, 35, 100); });
    }
    // ESTATÍSTICAS realistas (chutes / no alvo / escanteios) — contam por minuto SEM
    // cinemática, calibradas pelo λ. Os gols (abaixo) somam +1 chute e +1 no alvo cada,
    // então a conversão fica em ~10-15% e o "no alvo" sempre ≥ gols.
    for (const side of ["home", "away"]) {
      const pi = idx(side);
      const lam = state.lam[side];
      if (rnd() < clamp(0.06 + lam * 0.035, 0.02, 0.25)) { // ~9-12 chutes/time/jogo
        state.stats.shots[pi]++;
        const on = rnd() < 0.36; // ~36% no alvo (além dos gols)
        if (on) state.stats.onTarget[pi]++;
        state.xg[pi] += on ? 0.06 + rnd() * 0.07 : 0.015 + rnd() * 0.03; // qualidade da chance → xG
        logXg();
      }
      if (rnd() < clamp(0.035 + lam * 0.02, 0.01, 0.11)) state.stats.corners[pi]++; // ~4-6/time/jogo
    }
    // pênalti EM JOGO (raro, ~0.25/jogo) — proporcional ao ataque; PAUSA o jogo p/ a
    // cobrança (mini-tela). Preempta o gol do minuto.
    for (const side of ["home", "away"]) {
      if (rnd() < state.lam[side] * 0.00082) { doPenalty(side); return; }
    }
    // sorteio de gol (no máx. 1 por minuto p/ a cinemática ser vista)
    for (const side of ["home", "away"]) {
      const lam = state.lam[side];
      if (rnd() < lam / 90) { triggerGoal(side); return; }
    }
  }

  // Marca um gol "de verdade" (vindo do λ): escolhe o autor, posiciona e anima.
  function triggerGoal(side) {
    const pi = idx(side);
    const shooter = pickScorer(side);
    state.stats.shots[pi]++;
    state.stats.onTarget[pi]++;
    state.score[pi]++;
    const gx = attGoalX(side);
    const fromX = side === "home" ? 82 + rnd(8) : 18 - rnd(8);
    const fromY = clamp(38 + rnd(24), 28, 72);
    const aimY = 50 + (rnd() * 2 - 1) * 12;
    const gkDir = rnd() < 0.5 ? 1 : -1;
    state.xg[pi] += 0.5;
    logXg();
    emit("goal", side, { scorer: shooter.name, scorerId: shooter.id, score: [...state.score] });
    setCinematic({ type: "shot", side, fromX, fromY, targetX: gx, aimY, outcome: "goal", gkDir, shooter: shooter.name, holdMs: 1700 });
    state.ball = { x: gx, y: clamp(aimY, 6, 94) };
    state.possession = other(side);
    state.carrier = null; state.pass = null;
    state.momentum = clamp(state.momentum + (side === "home" ? 0.25 : -0.25), -1, 1);
  }

  // ---------- chute VISUAL (não pontua — gols vêm do λ) ----------
  function doShot(poss, shooter, bp) {
    const pi = idx(poss);
    const opp = other(poss);
    const gk = gkRating(opp);
    const sh = effOvr(shooter);
    state.stats.shots[pi]++;
    state.xg[pi] += clamp(0.06 + (sh - 70) / 240 + (bp - 0.78) * 0.2, 0.02, 0.4);
    logXg();

    const fromX = shooter.x, fromY = shooter.y;
    const onTarget = rnd() < clamp(0.34 + (sh - 70) / 160, 0.22, 0.72);
    let outcome, aimY, holdMs;
    if (!onTarget) {
      outcome = rnd() < 0.5 ? "wide" : "over";
      aimY = outcome === "wide" ? (rnd() < 0.5 ? 28 : 72) : 50 + (rnd() * 2 - 1) * 14;
      holdMs = 700;
    } else {
      state.stats.onTarget[pi]++;
      aimY = 50 + (rnd() * 2 - 1) * 12;
      outcome = rnd() < 0.06 ? "post" : "save"; // nunca gol aqui
      holdMs = outcome === "post" ? 850 : 950;
      emit(outcome, poss);
    }
    if (!onTarget) emit("shot", poss);
    const gkDir = outcome === "save" ? Math.sign(aimY - 50) || 1 : (rnd() < 0.5 ? Math.sign(aimY - 50) : -Math.sign(aimY - 50)) || 1;

    setCinematic({ type: "shot", side: poss, fromX, fromY, targetX: attGoalX(poss), aimY, outcome, gkDir, shooter: shooter.name, holdMs });
    state.ball = { x: attGoalX(poss), y: clamp(aimY, 6, 94) };
    state.possession = opp;
    state.carrier = null; state.pass = null;
  }

  // ---------- relógio ----------
  function step(dtMs, speed = 1) {
    if (state.over || state.paused) return [];
    const before = state.events.length;
    const real = Math.min(dtMs, 60);

    // cinemática em andamento → congela o relógio do jogo
    if (state.cinematic) {
      state.cinematic.holdMs -= real * Math.min(speed, 2);
      if (state.cinematic.holdMs <= 0) state.cinematic = null;
      moveTokens(real * speed);
      return state.events.slice(before);
    }
    // pênalti EM JOGO aguardando a cobrança → congela o relógio (igual à cinemática).
    // O loop só sai daqui quando a UI (host) chama resolvePenalty e zera penaltyPending.
    if (state.penaltyPending) {
      moveTokens(real * speed);
      return state.events.slice(before);
    }
    // intervalo aguardando os dois prontos
    if (state.phase === "INT") {
      if (state.ready.home && state.ready.away) {
        state.phase = "2T";
        state.possession = Math.random() < 0.5 ? "home" : "away";
        state.carrier = null; state.pass = null;
        emit("whistle", null, { text: "Começa o 2º tempo" });
      } else {
        moveTokens(real * speed);
        return state.events.slice(before);
      }
    }

    const scaled = real * speed;
    elapsed += scaled;
    const progress = clamp(elapsed / MATCH_MS_1X, 0, 1);
    const targetMinute = Math.min(90, Math.floor(progress * 90));

    // intervalo aos 45'
    if (targetMinute >= HALF && !halftimeHeld && state.phase === "1T") {
      halftimeHeld = true;
      state.minute = HALF;
      state.phase = "INT";
      emit("whistle", null, { text: "Intervalo" });
      return state.events.slice(before);
    }

    // avança MINUTO A MINUTO — cada minuto sorteia gol pelo λ (Poisson)
    while (state.minute < targetMinute && !state.cinematic && !state.penaltyPending) {
      state.minute++;
      minuteTick();
    }

    // decisões VISUAIS a cada SIM_STEP (não pontuam)
    if (!state.cinematic) {
      simAccum += scaled;
      let guard = 0;
      while (simAccum >= SIM_STEP && !state.cinematic && !state.penaltyPending && guard < 4) {
        simAccum -= SIM_STEP;
        simTick();
        guard++;
      }
    }
    updateTargets();
    moveTokens(scaled);

    if (progress >= 1 && state.phase !== "FIM" && state.phase !== "PEN") finish();
    return state.events.slice(before);
  }

  function finish() {
    const [h, a] = state.score;
    const winner = h > a ? "home" : a > h ? "away" : "draw";
    if (knockout && winner === "draw") {
      state.phase = "PEN";
      state.minute = 90;
      emit("whistle", null, { text: "Fim do tempo normal — pênaltis!" });
      return;
    }
    state.phase = "FIM";
    state.minute = 90;
    state.over = true;
    emit("whistle", null, { text: "Fim de jogo" });
  }

  function result(pens) {
    const [h, a] = state.score;
    let winner = h > a ? "home" : a > h ? "away" : "draw";
    if (pens) winner = pens.home > pens.away ? "home" : "away";
    const goalEvents = state.events.filter((e) => e.type === "goal").map((e) => ({
      minute: e.minute, type: "goal", side: e.side, scorer: e.scorer, scorerId: e.scorerId, score: e.score,
    }));
    const xg = [Math.round(state.xg[0] * 10) / 10, Math.round(state.xg[1] * 10) / 10];
    return { homeGoals: h, awayGoals: a, events: goalEvents, pens: pens || null, winner, xg, summary: buildSummary(pens, xg) };
  }

  // Súmula completa do §7: posse, finalizações, notas dos jogadores, craque, corrida
  // de xG e história por templates. Tudo derivado do MESMO fluxo de eventos.
  function buildSummary(pens, xg) {
    const st = state.stats;
    const possTot = st.possession[0] + st.possession[1] || 1;
    const ph = Math.round((st.possession[0] / possTot) * 100);
    const poss = [ph, 100 - ph];
    const goalsBy = {};
    for (const e of state.events) if (e.type === "goal" && e.scorerId) goalsBy[e.scorerId] = (goalsBy[e.scorerId] || 0) + 1;
    const notes = { home: [], away: [] };
    for (const side of ["home", "away"]) {
      const pi = idx(side), oi = 1 - pi;
      const scored = state.score[pi], conceded = state.score[oi];
      const shotsAg = state.stats.shots[oi] || 0;            // finalizações sofridas
      const possEdge = poss[pi] - poss[oi];                  // vantagem de posse (pp)
      for (const p of state.tokens[side]) {
        const g = goalsBy[p.id] || 0;
        let n = 6.0;
        // "dia" do jogador — variância individual por partida (um craque pode ir mal)
        n += (rnd() * 2 - 1) * 0.85;
        // qualidade leve: jogador melhor tende a render um pouco mais
        n += (p.ovr - 78) / 42;
        // gols (peso alto)
        n += g * 1.35;
        // contribuição por SETOR conforme o jogo
        if (p.pos === "GK") {
          n += conceded === 0 ? 1.5 : conceded === 1 ? 0.2 : -0.5 * (conceded - 1);
          n += shotsAg >= 6 && conceded <= 1 ? 0.4 : 0;       // segurou pressão
        } else if (p.pos === "DEF") {
          n += conceded === 0 ? 0.8 : -0.4 * conceded;
          n += shotsAg <= 6 ? 0.3 : shotsAg >= 12 ? -0.3 : 0; // defesa controlou os chutes
        } else if (p.pos === "MID") {
          n += clamp(possEdge / 60, -0.5, 0.6);               // controle de meio-campo
          n += g === 0 && scored > 0 ? 0.2 : 0;               // participou da construção
        } else { // ATT
          if (g === 0) n += scored > conceded ? -0.1 : -0.5;  // atacante sem gol pesa
          n += scored >= 3 ? 0.3 : 0;
        }
        // resultado coletivo
        n += (scored - conceded) * 0.16;
        // disciplina
        if (p.yellow) n -= 0.45 * p.yellow;
        if (p.out) n -= 1.7;
        notes[side].push({ id: p.id, num: p.num, name: p.name, pos: p.pos, goals: g, yellow: p.yellow || 0, out: !!p.out, note: Math.round(clamp(n, 3.5, 10) * 10) / 10 });
      }
    }
    let mvp = null;
    for (const side of ["home", "away"]) for (const pl of notes[side]) {
      if (!mvp || pl.note > mvp.note || (pl.note === mvp.note && pl.goals > mvp.goals)) {
        mvp = { ...pl, side, team: side === "home" ? state.home.name : state.away.name };
      }
    }
    const yel = [state.tokens.home.reduce((s, p) => s + (p.yellow ? 1 : 0), 0), state.tokens.away.reduce((s, p) => s + (p.yellow ? 1 : 0), 0)];
    return {
      score: [...state.score], xg, possession: poss,
      shots: [...st.shots], onTarget: [...st.onTarget], corners: [...st.corners], fouls: [...st.fouls],
      reds: [state.cards.home.length, state.cards.away.length], yellows: yel, men: { ...state.men },
      xgTimeline: state.xgTimeline.slice(), notes, mvp,
      pens: pens ? { home: pens.home, away: pens.away } : null,
      names: { home: state.home.name, away: state.away.name },
      colors: { home: state.home.color, away: state.away.color },
      story: buildStory(pens, xg, poss),
    };
  }

  function buildStory(pens, xg, poss) {
    const [h, a] = state.score;
    const diff = h - a;
    const side = pens ? (pens.home > pens.away ? "home" : "away") : diff > 0 ? "home" : diff < 0 ? "away" : "draw";
    const W = side === "home" ? state.home.name : side === "away" ? state.away.name : null;
    const L = side === "home" ? state.away.name : state.home.name;
    if ((h >= 7 && a === 0) || (a >= 7 && h === 0)) return `${h >= 7 ? state.home.name : state.away.name} aplicou um 7 a 0 — o placar lendário do 7a0!`;
    if (pens) return `Decidido nos pênaltis: ${W} levou a melhor após o empate em ${h}.`;
    if (side === "draw") return `Empate em ${h} a ${a} — jogo parelho, ninguém quis ceder.`;
    const wxg = side === "home" ? xg[0] : xg[1], lxg = side === "home" ? xg[1] : xg[0];
    const wposs = side === "home" ? poss[0] : poss[1];
    if (lxg > wxg + 0.5) return `${W} venceu sem merecer tanto: ${L} criou mais, mas faltou pontaria (ou sobrou goleiro).`;
    if (wposs < 42) return `Vitória cirúrgica no contra-ataque: ${W} teve menos a bola, mas foi clínico.`;
    if (Math.abs(diff) >= 3) return `Goleada: ${W} atropelou ${L} por ${Math.abs(diff)} de diferença.`;
    if (wposs > 58) return `${W} dominou a posse e controlou o jogo até o fim.`;
    return `${W} venceu um jogo equilibrado por ${Math.abs(diff)}.`;
  }

  // ---------- API ----------
  return {
    state,
    isOver: () => state.over,
    needsPens: () => state.phase === "PEN",
    setTactic(side, patch) { state.tactics[side] = { ...state.tactics[side], ...patch }; recalcLam(); },
    setPaused(v) { state.paused = v; },
    togglePause() { state.paused = !state.paused; return state.paused; },
    setReady(side) { state.ready[side] = true; },
    isHalftime: () => state.phase === "INT",
    substitute(side, outId, inPlayer) {
      if (state.subsLeft[side] <= 0 || !inPlayer) return false;
      const arr = state.tokens[side];
      const i = arr.findIndex((t) => t.id === outId && !t.out);
      if (i < 0) return false;
      const old = arr[i];
      arr[i] = { ...old, id: inPlayer.id, name: inPlayer.name, pos: inPlayer.pos, ovr: inPlayer.ovr, flag: inPlayer.flag, stamina: 100 };
      state.subsLeft[side]--;
      state.bench[side] = state.bench[side].filter((p) => p.id !== inPlayer.id);
      emit("sub", side, { outName: old.name, inName: inPlayer.name });
      recalcLam();
      return true;
    },
    step,
    result,
    resolvePenalty,
  };
}
