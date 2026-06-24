import { POS_COLOR, POS_LABEL } from "../engine/players.js";

// Paletas para personalização de time
export const TEAM_COLORS = [
  "#2bd66a", "#ffd23f", "#ff7a59", "#5ac8fa", "#c77dff",
  "#ff5a8a", "#34e0c4", "#f5a524", "#7bdb4a", "#ff5a52",
];
export const TEAM_EMOJIS = [
  "🦁", "🐯", "🦅", "🐺", "🦈", "🐂", "🐉", "🦂", "⚡", "🔥",
  "👑", "💀", "🚀", "⭐", "🐍", "🦏", "🐗", "🦣", "🌪️", "🍀",
];

export function Logo({ size = "lg" }) {
  return (
    <div className={`logo logo-${size}`}>
      <span className="logo-ball" aria-hidden>⚽</span>
      <span className="logo-word">
        Fut<span className="logo-accent">Draft</span>
      </span>
    </div>
  );
}

// Linha de cal — divisor assinatura do projeto
export function ChalkLine({ label }) {
  return (
    <div className="chalk-line" role="separator">
      <span className="chalk-line-bar" />
      {label && <span className="chalk-line-label">{label}</span>}
      <span className="chalk-line-bar" />
    </div>
  );
}

// Marcações de campo desenhadas atrás do herói (assinatura visual)
export function PitchMarks() {
  return (
    <svg className="pitch-marks" viewBox="0 0 400 300" aria-hidden preserveAspectRatio="xMidYMid slice">
      <g fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="200" cy="150" r="60" />
        <line x1="200" y1="0" x2="200" y2="300" />
        <circle cx="200" cy="150" r="3" fill="currentColor" stroke="none" />
        <rect x="0" y="95" width="46" height="110" />
        <rect x="354" y="95" width="46" height="110" />
      </g>
    </svg>
  );
}

export function Avatar({ emoji, color, size = 40, online }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: `${color}22`, borderColor: `${color}88`, fontSize: size * 0.5 }}
    >
      <span aria-hidden>{emoji}</span>
      {online != null && <span className={`avatar-dot ${online ? "on" : "off"}`} />}
    </span>
  );
}

export function PosBadge({ pos, small }) {
  return (
    <span
      className={`pos-badge ${small ? "small" : ""}`}
      style={{ color: POS_COLOR[pos], borderColor: `${POS_COLOR[pos]}66`, background: `${POS_COLOR[pos]}1a` }}
      title={POS_LABEL[pos]}
    >
      {pos}
    </span>
  );
}

export function Ovr({ value }) {
  let cls = "ovr-low";
  if (value >= 86) cls = "ovr-elite";
  else if (value >= 79) cls = "ovr-high";
  else if (value >= 70) cls = "ovr-mid";
  return <span className={`ovr ${cls}`}>{value}</span>;
}

export function Crown() {
  return (
    <span className="crown" title="Anfitrião" aria-label="Anfitrião">👑</span>
  );
}

export function Eyebrow({ children, accent }) {
  return <div className={`eyebrow ${accent ? "accent" : ""}`}>{children}</div>;
}
