import { useState } from "react";
import { Avatar, Crown, TEAM_COLORS, TEAM_EMOJIS } from "./bits.jsx";

const FORMATS = [
  { id: "knockout", label: "Mata-mata" },
  { id: "league", label: "Pontos corridos" },
];
const MODALITIES = [
  { id: "pvp", label: "Técnicos ×", desc: "Os XI se enfrentam" },
  { id: "cup", label: "Copa vs Seleções", desc: "Enfrente seleções reais" },
];
const DIFFICULTIES = [
  { id: "classic", label: "Clássico", desc: "Notas visíveis" },
  { id: "almanac", label: "Almanaque", desc: "Notas ocultas" },
];
const TIMERS = [
  { id: 20, label: "20s" },
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 0, label: "∞" },
];

export default function Lobby({ state, myId, online, isHost, isLocal, actions, hostOffline }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const me = state.players.find((p) => p.id === myId);
  const onlineSet = new Set(online);
  const canStart = state.players.length >= 2;
  const set = state.settings;

  function copy() {
    navigator.clipboard?.writeText(state.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }, () => {});
  }
  function addLocal() {
    const n = prompt("Nome do técnico:");
    if (n && n.trim()) actions.addLocalPlayer(n.trim());
  }

  const emptySlots = Math.max(0, (isHost ? 6 : state.players.length) - state.players.length);

  return (
    <div className="split lobby-split">
      {/* ESQUERDA — código + configurações */}
      <div className="split-left lobby-left">
        <span className="home-kicker">Sala aberta · aguardando</span>

        <div className="code-board">
          <div className="code-board-label">Código da sala</div>
          <div className="code-value">{state.code}</div>
          <button className="btn btn-ghost btn-block code-copy" onClick={copy}>
            {copied ? "✓ Copiado" : "Copiar código"}
          </button>
          {isLocal && <span className="tag tag-local">modo local</span>}
        </div>

        {hostOffline && !isHost && (
          <div className="banner banner-warn">
            O anfitrião saiu. <button className="linkbtn" onClick={actions.claimHost}>Assumir o comando</button>
          </div>
        )}

        {/* configurações em mini-cards */}
        <div className="cfg-grid">
          <CfgCard label="Modalidade" options={MODALITIES} value={set.modality || "pvp"} isHost={isHost} onPick={(v) => actions.setSettings({ modality: v })} />
          <CfgCard label="Dificuldade" options={DIFFICULTIES} value={set.difficulty || "classic"} isHost={isHost} onPick={(v) => actions.setSettings({ difficulty: v })} />
          <CfgCard label="Formato" options={FORMATS} value={set.format || "knockout"} isHost={isHost} onPick={(v) => actions.setSettings({ format: v })} />
          <div className="cfg-card">
            <div className="cfg-card-label">Tempo p/ escolha</div>
            <div className="cfg-timers">
              {TIMERS.map((t) => (
                <button key={t.id} className={`cfg-timer ${(set.turnTimer ?? 30) === t.id ? "sel" : ""}`} disabled={!isHost} onClick={() => isHost && actions.setSettings({ turnTimer: t.id })}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {editing && me && (
          <div className="card edit-card">
            <label className="field">
              <span className="field-label">Nome do time</span>
              <input className="input" maxLength={20} value={me.teamName} onChange={(e) => actions.updateMe({ teamName: e.target.value })} />
            </label>
            <div className="field-label">Escudo</div>
            <div className="picker-grid">
              {TEAM_EMOJIS.map((em) => (
                <button key={em} className={`picker-emoji ${me.emoji === em ? "sel" : ""}`} onClick={() => actions.updateMe({ emoji: em })}>{em}</button>
              ))}
            </div>
            <div className="field-label">Cor</div>
            <div className="picker-row">
              {TEAM_COLORS.map((c) => (
                <button key={c} className={`picker-color ${me.color === c ? "sel" : ""}`} style={{ background: c }} onClick={() => actions.updateMe({ color: c })} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* DIREITA — técnicos + iniciar */}
      <div className="split-right lobby-right">
        <div className="lobby-right-head">
          <h1 className="screen-title lobby-title">Técnicos na sala</h1>
          <span className="lobby-count"><span className="live-dot" /> {state.players.length} {state.players.length > 1 ? "técnicos" : "técnico"}</span>
        </div>

        <div className="tecnicos-grid">
          {state.players.map((p) => {
            const isOnline = isLocal || p.isBot || onlineSet.has(p.id);
            const mine = p.id === myId;
            return (
              <div key={p.id} className={`tecnico-card ${mine ? "mine" : ""}`}>
                <Avatar emoji={p.emoji} color={p.color} size={46} online={isLocal ? null : isOnline} />
                <div className="tecnico-info">
                  <div className="tecnico-team">{p.teamName}{state.hostId === p.id && <Crown />}</div>
                  <div className="tecnico-name">{p.name}{mine && <span className="tag tag-you">você</span>}{p.isBot && <span className="tag tag-bot">BOT</span>}</div>
                </div>
                {state.hostId === p.id ? (
                  <span className="tag tag-host">Anfitrião</span>
                ) : isOnline ? (
                  <span className="tecnico-status on">● Online</span>
                ) : (
                  <span className="tecnico-status">entrando…</span>
                )}
                {mine && (
                  <button className="btn btn-ghost btn-sm tecnico-edit" onClick={() => setEditing((v) => !v)}>{editing ? "Fechar" : "Editar"}</button>
                )}
                {isHost && (p.isBot || p.id.startsWith("local_")) && (
                  <button className="roster-x" title="Remover" onClick={() => actions.removePlayer(p.id)}>×</button>
                )}
              </div>
            );
          })}

          {isHost && Array.from({ length: emptySlots }).slice(0, 2).map((_, i) => (
            <div className="tecnico-card vaga" key={"v" + i}>
              <span className="vaga-plus">+</span>
              <span className="vaga-text">Vaga livre — adicione abaixo</span>
            </div>
          ))}
        </div>

        {(isLocal || isHost) && (
          <div className="lobby-add">
            {isLocal && <button className="btn btn-ghost" onClick={addLocal}>+ Técnico</button>}
            {isHost && <button className="btn btn-ghost" onClick={actions.addBot}>+ Seleção 🌍</button>}
          </div>
        )}
        {isHost && state.players.length === 1 && (
          <p className="hint">Jogue sozinho: adicione seleções reais (Brasil 2022, Argentina 1986…) como adversárias. 🌍</p>
        )}

        <div className="lobby-actions">
          {isHost ? (
            <button className="btn btn-primary btn-block btn-xl" onClick={actions.startDraft} disabled={!canStart}>
              {canStart ? "Iniciar Draft" : "Esperando mais um técnico…"} {canStart && <span className="arr">→</span>}
            </button>
          ) : (
            <div className="waiting">Aguardando o anfitrião iniciar o draft…</div>
          )}
          <button className="btn btn-ghost btn-block" onClick={actions.leave}>Sair da sala</button>
        </div>
      </div>
    </div>
  );
}

function CfgCard({ label, options, value, isHost, onPick }) {
  const cur = options.find((o) => o.id === value) || options[0];
  const idx = options.findIndex((o) => o.id === value);
  function cycle() {
    if (!isHost) return;
    onPick(options[(idx + 1) % options.length].id);
  }
  return (
    <button className={`cfg-card ${isHost ? "" : "locked"}`} onClick={cycle} disabled={!isHost}>
      <div className="cfg-card-label">{label}</div>
      <div className="cfg-card-value">{cur.label}</div>
      {cur.desc && <div className="cfg-card-desc">{cur.desc}</div>}
    </button>
  );
}
