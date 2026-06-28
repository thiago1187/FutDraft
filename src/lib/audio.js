// Áudio híbrido da partida: apitos SINTETIZADOS (Tone.js, sem arquivo) + 1 mp3 de gol
// (torcida de estádio, public/sfx/goal.mp3). Política de autoplay: nada toca antes da 1ª
// interação do usuário — chame unlockAudio() num gesto (click/touch). Silêncio fica a
// cargo de quem chama (não tocar em bot×bot / simular-tudo). Volume comedido.
import * as Tone from "tone";

let _started = false;   // Tone.start() já rodou (após gesto do usuário)
let _enabled = true;    // preferência de som (profiles.prefs.sound)
let _volume = 0.7;      // 0..1 (profiles.prefs.volume)
let _synth = null;      // sintetizador dos apitos (mono — sequências não se sobrepõem)
let _vol = null;        // nó de volume mestre
let _goal = null;       // <audio> do gol, pré-carregado

const linToDb = (v) => (v <= 0 ? -60 : 20 * Math.log10(v));

function ensureNodes() {
  if (_synth) return;
  _vol = new Tone.Volume(linToDb(_volume)).toDestination();
  _synth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.004, decay: 0.04, sustain: 0.5, release: 0.06 },
  }).connect(_vol);
}

// Deve ser chamada no 1º gesto do usuário (autoplay policy dos navegadores).
export async function unlockAudio() {
  if (_started) return true;
  try { await Tone.start(); _started = true; ensureNodes(); return true; } catch { return false; }
}

export function setSound({ enabled, volume } = {}) {
  if (typeof enabled === "boolean") _enabled = enabled;
  if (typeof volume === "number") {
    _volume = Math.max(0, Math.min(1, volume));
    if (_vol) _vol.volume.value = linToDb(_volume);
    if (_goal) _goal.volume = _volume;
  }
}

// Pré-carrega o mp3 do gol no início da partida (sem tocar).
export function preloadGoal() {
  if (_goal || typeof Audio === "undefined") return;
  try {
    _goal = new Audio("/sfx/goal.mp3");
    _goal.preload = "auto";
    _goal.volume = _volume;
    _goal.load();
  } catch { /* ignora */ }
}

// Sequências de apito por evento: [nota, duração]. O vermelho é mais longo/duplo que o
// amarelo; o final é uma cadência de 3 toques. Tons curtos e limpos.
const WHISTLE = {
  kickoff: [["A5", "8n"]],
  halftime: [["A5", "16n"], ["C6", "16n"]],
  yellow: [["G5", "16n"]],
  red: [["G5", "8n"], ["G5", "4n"]],
  final: [["A5", "8n"], ["F5", "8n"], ["D5", "2n"]],
};

export function playWhistle(kind) {
  if (!_started || !_enabled) return;
  ensureNodes();
  const seq = WHISTLE[kind] || WHISTLE.kickoff;
  let t = Tone.now() + 0.02;
  for (const [note, dur] of seq) {
    _synth.triggerAttackRelease(note, dur, t);
    t += Tone.Time(dur).toSeconds() + 0.04;
  }
}

export function playGoal() {
  if (!_started || !_enabled) return;
  preloadGoal();
  if (!_goal) return;
  try { _goal.currentTime = 0; _goal.volume = _volume; _goal.play().catch(() => {}); } catch { /* ignora */ }
}
