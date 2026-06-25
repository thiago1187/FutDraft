import { POS_COLOR, POS_LABEL } from "../engine/players.js";

// Paleta de cores distintas (até 16 times sem cores repetidas numa mesma sala).
export const TEAM_COLORS = [
  "#e94e27", "#2b5ba8", "#3f9c63", "#ffd23f", "#c77dff",
  "#ff5a8a", "#34e0c4", "#f5a524", "#7bdb4a", "#5ac8fa",
  "#9b5de5", "#ff8c42", "#118ab2", "#ef476f", "#06d6a0", "#8d6e63",
];

export const TEAM_EMOJIS = [
  "🦁", "🐯", "🦅", "🐺", "🦈", "🐂", "🐉", "🦂", "⚡", "🔥",
  "👑", "💀", "🚀", "⭐", "🐍", "🦏", "🐗", "🦣", "🌪️", "🍀",
];

// Bandeiras (imagens — funcionam em qualquer SO, inclusive Windows) por código ISO-2.
// Escudo de bandeira é guardado como a string "fl:<código>" (ex.: "fl:br", "fl:gb-eng").
export const TEAM_FLAGS = [
  // Sul-América
  "br", "ar", "uy", "co", "cl", "pe", "ec", "py", "bo", "ve",
  // América do Norte e Central
  "mx", "us", "ca", "cr", "pa", "hn", "gt", "jm", "tt", "cu",
  // Europa Ocidental
  "fr", "es", "de", "it", "pt", "nl", "be", "ch", "at", "no",
  "se", "dk", "fi", "ie", "is", "lu", "cy",
  // Europa Oriental / Balcãs
  "pl", "ru", "ua", "rs", "hr", "ro", "cz", "sk", "hu", "bg",
  "si", "ba", "mk", "al", "me", "ee", "lv", "lt", "by", "md",
  // Ilhas Britânicas
  "gb-eng", "gb-sct", "gb-wls",
  // Turquia / Grécia
  "tr", "gr",
  // África do Norte
  "eg", "ma", "dz", "tn", "ly",
  // África Subsaariana
  "ng", "sn", "gh", "cm", "ci", "ml", "gn", "za", "ke", "et",
  "tz", "ug", "mz", "zm", "ao", "cd", "tg",
  // Oriente Médio
  "sa", "ir", "qa", "ae", "jo", "iq", "kw",
  // Ásia
  "jp", "kr", "cn", "in", "th", "id", "vn", "ph", "my", "pk",
  // Oceania
  "au", "nz",
];

export function flagUrl(code) {
  return `https://flagcdn.com/w80/${code}.png`;
}
export function isFlagEscudo(v) {
  return typeof v === "string" && v.startsWith("fl:");
}
// Converte um emoji de bandeira (indicadores regionais, ex.: 🇧🇷) em código ISO-2 ("br").
export function flagCodeFromEmoji(s) {
  if (typeof s !== "string") return null;
  const cps = [...s];
  if (cps.length === 2) {
    const a = cps[0].codePointAt(0), b = cps[1].codePointAt(0);
    const A = 0x1f1e6, Z = 0x1f1ff;
    if (a >= A && a <= Z && b >= A && b <= Z) {
      return String.fromCharCode(97 + (a - A)) + String.fromCharCode(97 + (b - A));
    }
  }
  return null;
}
// Devolve o código de bandeira (imagem) de um escudo, seja "fl:br" ou o emoji 🇧🇷.
export function escudoFlag(v) {
  if (isFlagEscudo(v)) return v.slice(3);
  return flagCodeFromEmoji(v);
}
// Escudo de bandeira por URL direta (seleções históricas: "fls:<url>").
export function isFlagSrcEscudo(v) {
  return typeof v === "string" && v.startsWith("fls:");
}
// URL da imagem de bandeira de QUALQUER escudo: "fls:<url>" | "fl:<iso2>" | emoji 🇧🇷.
export function escudoImg(v) {
  if (isFlagSrcEscudo(v)) return v.slice(4);
  const code = escudoFlag(v);
  return code ? flagUrl(code) : null;
}

// Bandeira como imagem (funciona em qualquer SO, inclusive Windows que não
// renderiza emoji de bandeira). Prioridade: src (URL direta, p/ históricas) →
// iso2 (flagcdn) → emoji (último recurso).
export function Flag({ iso2, src, emoji, className = "", round }) {
  const url = src || (iso2 ? flagUrl(iso2) : null);
  if (url) {
    return (
      <img
        className={`flag-img ${round ? "round" : ""} ${className}`}
        src={url}
        alt=""
        loading="lazy"
        draggable={false}
      />
    );
  }
  return <span className={`flag-emoji ${className}`} aria-hidden>{emoji || "🏳️"}</span>;
}

// Próxima cor livre (não usada por ninguém na sala).
export function freeColor(usedColors) {
  const used = new Set(usedColors);
  return TEAM_COLORS.find((c) => !used.has(c)) || TEAM_COLORS[usedColors.length % TEAM_COLORS.length];
}

export function Logo({ size = "lg" }) {
  if (size === "sm") {
    return (
      <div className="logo logo-sm">
        <span className="logo-word">Fut<span className="logo-accent">Draft</span></span>
        <span className="logo-ball" aria-hidden />
      </div>
    );
  }
  return (
    <div className="logo logo-lg">
      <span className="logo-line">FUT</span>
      <span className="logo-line">
        DRAFT<span className="logo-ball" aria-hidden />
      </span>
      <span className="logo-bar" aria-hidden />
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
  const flagSrc = escudoImg(emoji);
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, background: `${color}22`, borderColor: `${color}88`, fontSize: size * 0.5 }}
    >
      {flagSrc ? (
        <img className="avatar-flag" src={flagSrc} alt="" loading="lazy" />
      ) : (
        <span aria-hidden>{emoji}</span>
      )}
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
