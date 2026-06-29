// Áudio da partida: 3 mp3 em public/sfx — gol (goal.mp3), cartão vermelho + fim do 1º
// tempo (foul.mp3) e fim de jogo (end-game.mp3). Sem apitos sintetizados. Política de
// autoplay: nada toca antes da 1ª interação do usuário — chame unlockAudio() num gesto
// (click/touch). Silêncio fica a cargo de quem chama (não tocar em bot×bot). Volume comedido.

let _started = false;   // já houve gesto do usuário (autoplay liberado)
let _enabled = true;    // preferência de som (profiles.prefs.sound)
let _volume = 0.7;      // 0..1 (profiles.prefs.volume)
let _goal = null;       // <audio> do gol (goal.mp3)
let _foul = null;       // <audio> de cartão vermelho / fim do 1º tempo (foul.mp3)
let _endGame = null;    // <audio> de fim de jogo (end-game.mp3)

function makeSfx(src) {
  if (typeof Audio === "undefined") return null;
  try {
    const a = new Audio(src);
    a.preload = "auto";
    a.volume = _volume;
    a.load();
    return a;
  } catch { return null; }
}

// Pré-carrega os mp3 da partida (sem tocar): gol, falta/cartão, fim de jogo.
export function preloadGoal() {
  if (!_goal) _goal = makeSfx("/sfx/goal.mp3");
  if (!_foul) _foul = makeSfx("/sfx/foul.mp3");
  if (!_endGame) _endGame = makeSfx("/sfx/end-game.mp3");
}

// Deve ser chamada no 1º gesto do usuário (autoplay policy). "Prime" cada elemento com um
// play()/pause() mudo, ainda dentro do gesto, p/ liberar o autoplay nos navegadores estritos.
export async function unlockAudio() {
  if (_started) return true;
  _started = true;
  preloadGoal();
  for (const a of [_goal, _foul, _endGame]) {
    if (!a) continue;
    try { a.muted = true; await a.play(); a.pause(); a.currentTime = 0; a.muted = false; } catch { /* ignora */ }
  }
  return true;
}

export function setSound({ enabled, volume } = {}) {
  if (typeof enabled === "boolean") _enabled = enabled;
  if (typeof volume === "number") {
    _volume = Math.max(0, Math.min(1, volume));
    for (const a of [_goal, _foul, _endGame]) if (a) a.volume = _volume;
  }
}

function playSfx(a) {
  if (!_started || !_enabled || !a) return;
  try { a.currentTime = 0; a.volume = _volume; a.play().catch(() => {}); } catch { /* ignora */ }
}

export function playGoal() { preloadGoal(); playSfx(_goal); }

// Cartão vermelho e fim do 1º tempo (intervalo).
export function playFoul() { preloadGoal(); playSfx(_foul); }

// Fim de jogo.
export function playEndGame() { preloadGoal(); playSfx(_endGame); }
