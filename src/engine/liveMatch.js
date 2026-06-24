// Motor de partida AO VIVO — "futebol de botões" 2D.
// Roda por ticks em tempo real (cliente). Produz posições de jogadores + bola para o
// campo 2D e, ao fim, um `result` no MESMO formato de simulateMatch (homeGoals,
// awayGoals, events[goal], pens, winner, xg) para alimentar o torneio.
//
// Campo normalizado: x = comprimento 0..100 (casa ataca para a direita, x→100),
// y = largura 0..100. A partida dura ~95s a 1×; o multiplicador de velocidade acelera.

import { teamRatings } from "./match.js";

const MATCH_MS_1X = 95000; // 90' jogados em ~95s a 1×
const HALF = 45;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function rnd(a = 1) {
  return Math.random() * a;
}

const TACTIC_DEFAULT = { posture: "equilibrado", line: "media", marking: "leve", build: "toque" };

// Posições base no campo (x comprimento, y largura) a partir dos slots da formação.
function basePositions(team, side) {
  const slots = team.lineup?.formation?.slots || [];
  const starters = team.squad;
  return starters.map((p, i) => {
    const slot = slots[i] || { x: 50, y: 50 };
    // slot.y = profundidade 0..100 (0 = própria defesa). Mapeia p/ comprimento.
    const depth = slot.y; // 0..100
    const bx = side === "home" ? 4 + depth * 0.46 : 96 - depth * 0.46;
    const by = clamp(slot.x, 8, 92);
    return {
      id: p.id,
      num: jersey(p, i),
      name: p.name,
      pos: p.pos,
      ovr: p.ovr,
      flag: p.flag,
      bx,
      by,
      x: bx,
      y: by,
      stamina: 100,
    };
  });
}

function jersey(p, i) {
  if (p.pos === "GK") return 1;
  return [2, 3, 4, 5, 6, 7, 8, 9, 10, 11][i % 10] || i + 1;
}

function postureFactor(t) {
  if (t.posture === "ofensivo") return { atk: 1.18, def: 0.88 };
  if (t.posture === "defensivo") return { atk: 0.84, def: 1.18 };
  return { atk: 1, def: 1 };
}

export function createLiveMatch(home, away, opts = {}) {
  const knockout = !!opts.knockout;
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
    tokens: {
      home: basePositions({ ...home, lineup: home.lineup }, "home"),
      away: basePositions({ ...away, lineup: away.lineup }, "away"),
    },
    bench: { home: home.bench || [], away: away.bench || [] },
    tactics: { home: { ...TACTIC_DEFAULT }, away: { ...TACTIC_DEFAULT } },
    subsLeft: { home: 5, away: 5 },
    subsMade: { home: 0, away: 0 },
    events: [],
    lastEvent: null,
    pens: null,
    xg: [0, 0],
    stats: { possession: [0, 0], shots: [0, 0], onTarget: [0, 0], corners: [0, 0] },
    paused: false,
    over: false,
    ratings: { home: rh, away: ra },
  };

  let elapsed = 0; // ms de jogo acumulados (escala 1×)
  let attackPhase = 0; // 0..1 progresso do ataque atual rumo ao gol
  let halftimeHeld = false;

  function emit(type, side, extra = {}) {
    const ev = { minute: state.minute, type, side, ...extra };
    state.events.push(ev);
    if (type === "goal" || type === "save" || type === "penalty" || type === "corner" || type === "whistle")
      state.lastEvent = ev;
    return ev;
  }

  function attackingGoalX(side) {
    return side === "home" ? 98 : 2;
  }

  function pickScorer(side) {
    const team = side === "home" ? home.squad : away.squad;
    const weights = team.map((p) =>
      p.pos === "ATT" ? p.ovr * p.ovr * 0.02 : p.pos === "MID" ? p.ovr * 0.9 : p.pos === "DEF" ? p.ovr * 0.12 : 0.02
    );
    const total = weights.reduce((s, x) => s + x, 0) || 1;
    let r = rnd(total);
    for (let i = 0; i < team.length; i++) {
      r -= weights[i];
      if (r <= 0) return team[i];
    }
    return team[team.length - 1];
  }

  // Probabilidade de gol numa finalização.
  function shotOutcome(side) {
    const atkR = side === "home" ? rh : ra;
    const defR = side === "home" ? ra : rh;
    const pf = postureFactor(state.tactics[side]);
    const base = 0.30 + (atkR.attack * pf.atk - defR.defense) / 110;
    return clamp(base, 0.08, 0.62);
  }

  // Move os jogadores e a bola em direção a alvos a cada chamada.
  function moveTokens(dt) {
    const k = clamp(dt / 900, 0.02, 0.5);
    const poss = state.possession;
    const dirGoalX = attackingGoalX(poss);
    // bola caminha rumo ao gol atacado conforme attackPhase
    const targetBX = lerp(50, dirGoalX, attackPhase);
    const targetBY = clamp(state.ball.y + (rnd(2) - 1) * 6, 14, 86);
    state.ball.x = lerp(state.ball.x, targetBX, k * 1.3);
    state.ball.y = lerp(state.ball.y, targetBY, k);

    for (const side of ["home", "away"]) {
      const attacking = side === poss;
      state.tokens[side].forEach((tk, i) => {
        if (tk.pos === "GK") {
          // goleiro acompanha levemente a largura da bola
          tk.y = lerp(tk.y, lerp(tk.by, state.ball.y, 0.25), k);
          tk.x = tk.bx;
          return;
        }
        // empurra para frente quem ataca; recua quem defende
        const push = attacking ? 10 + attackPhase * 16 : -6;
        const sx = side === "home" ? push : -push;
        const towardBallY = lerp(tk.by, state.ball.y, attacking ? 0.18 : 0.28);
        const tx = clamp(tk.bx + sx + (rnd(4) - 2), 4, 96);
        const ty = clamp(towardBallY + (rnd(6) - 3), 6, 94);
        tk.x = lerp(tk.x, tx, k);
        tk.y = lerp(tk.y, ty, k);
      });
    }
  }

  // Avança a lógica de jogo (posse, ataque, finalização) em "ticks de minuto".
  function gameTick() {
    const poss = state.possession;
    const pi = poss === "home" ? 0 : 1;
    const def = poss === "home" ? "away" : "home";
    const pf = postureFactor(state.tactics[poss]);
    const dpf = postureFactor(state.tactics[def]);

    state.stats.possession[pi]++; // posse acumulada por tique

    // avança o ataque (estilo "direto" amadurece mais rápido)
    const buildFactor = state.tactics[poss].build === "direto" ? 1.25 : 1;
    const advance = (0.12 + rnd(0.16) * pf.atk) * buildFactor;
    attackPhase += advance;

    // chance de perda de posse (pressão da defesa / marcação)
    const press = state.tactics[def].marking === "pressao" ? 0.16 : 0.10;
    const turnover = press * dpf.def + (attackPhase > 0.6 ? 0.05 : 0);
    if (rnd(1) < turnover) {
      state.possession = def;
      attackPhase = 0.1;
      state.ball.y = clamp(state.ball.y + rnd(30) - 15, 12, 88);
      if (rnd(1) < 0.18) {
        state.stats.corners[pi]++;
        emit("corner", poss);
      }
      return;
    }

    // finalização quando o ataque amadurece
    if (attackPhase >= 1) {
      state.xg[pi] += shotOutcome(poss) * 0.5;
      state.stats.shots[pi]++;
      if (rnd(1) < shotOutcome(poss)) {
        state.stats.onTarget[pi]++;
        const scorer = pickScorer(poss);
        state.score[pi]++;
        emit("goal", poss, { scorer: scorer?.name || "Gol", scorerId: scorer?.id || null, score: [...state.score] });
      } else if (rnd(1) < 0.6) {
        state.stats.onTarget[pi]++;
        emit("save", poss);
      } else {
        emit("shot", poss);
      }
      state.possession = def; // recomeça do outro lado
      attackPhase = 0.05;
      state.ball.x = 50;
    }
  }

  return {
    state,
    isOver: () => state.over,
    setTactic(side, patch) {
      state.tactics[side] = { ...state.tactics[side], ...patch };
    },
    setPaused(v) {
      state.paused = v;
    },
    togglePause() {
      state.paused = !state.paused;
      return state.paused;
    },
    // Substituição: troca um titular pelo reserva (mantém o slot de posição).
    substitute(side, outId, inPlayer) {
      if (state.subsLeft[side] <= 0) return false;
      const arr = state.tokens[side];
      const idx = arr.findIndex((t) => t.id === outId);
      if (idx < 0 || !inPlayer) return false;
      const old = arr[idx];
      arr[idx] = {
        ...old,
        id: inPlayer.id,
        name: inPlayer.name,
        pos: inPlayer.pos,
        ovr: inPlayer.ovr,
        flag: inPlayer.flag,
        stamina: 100,
      };
      state.subsLeft[side]--;
      state.subsMade[side]++;
      // remove do banco e devolve o que saiu
      state.bench[side] = state.bench[side].filter((p) => p.id !== inPlayer.id);
      emit("sub", side, { outName: old.name, inName: inPlayer.name });
      return true;
    },
    // Avança o relógio. speed = 1|2|4. Devolve eventos novos desde a última chamada.
    step(dtMs, speed = 1) {
      if (state.over || state.paused) return [];
      const before = state.events.length;
      const scaled = dtMs * speed;
      elapsed += scaled;
      const progress = clamp(elapsed / MATCH_MS_1X, 0, 1);
      const newMinute = Math.min(90, Math.floor(progress * 90));

      // intervalo aos 45'
      if (newMinute >= HALF && !halftimeHeld && state.phase === "1T") {
        state.minute = HALF;
        state.phase = "INT";
        halftimeHeld = true;
        emit("whistle", null, { text: "Intervalo" });
        return state.events.slice(before);
      }
      if (state.phase === "INT") {
        state.phase = "2T";
        emit("whistle", null, { text: "Começa o 2º tempo" });
      }

      // dispara ticks de jogo conforme o minuto avança
      while (state.minute < newMinute) {
        state.minute++;
        gameTick();
        // desgaste
        for (const side of ["home", "away"])
          state.tokens[side].forEach((t) => (t.stamina = clamp(t.stamina - 0.25, 40, 100)));
      }
      moveTokens(scaled);

      if (progress >= 1 && state.phase !== "FIM" && state.phase !== "PEN") {
        finish();
      }
      return state.events.slice(before);
    },
    // Apenas movimento suave (para animar entre ticks sem alterar o jogo).
    animate(dtMs, speed = 1) {
      if (state.over || state.paused) return;
      moveTokens(dtMs * speed);
    },
    finishNow: () => finish(),
    needsPens: () => state.phase === "PEN",
    result,
  };

  function finish() {
    const [h, a] = state.score;
    let winner = h > a ? "home" : a > h ? "away" : "draw";
    if (knockout && winner === "draw") {
      state.phase = "PEN";
      state.minute = 90;
      emit("whistle", null, { text: "Fim do tempo normal — pênaltis!" });
      return; // pênaltis resolvidos por fora (componente)
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
    const goalEvents = state.events
      .filter((e) => e.type === "goal")
      .map((e) => ({
        minute: e.minute,
        type: "goal",
        side: e.side,
        scorer: e.scorer,
        scorerId: e.scorerId,
        score: e.score,
      }));
    return {
      homeGoals: h,
      awayGoals: a,
      events: goalEvents,
      pens: pens || null,
      winner,
      xg: [Math.round(state.xg[0] * 10) / 10, Math.round(state.xg[1] * 10) / 10],
    };
  }
}

// Disputa de pênaltis interativa (resolve quando ambos terminam 5 ou morte súbita).
export function createShootout(home, away) {
  function kickProb(squad) {
    const r = teamRatings(squad);
    return clamp(0.62 + (r.overall - 70) / 120, 0.55, 0.92);
  }
  return {
    home: { goals: 0, kicks: [], prob: kickProb(home.squad) },
    away: { goals: 0, kicks: [], prob: kickProb(away.squad) },
  };
}
