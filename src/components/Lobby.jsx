import { useState } from "react";
import { Avatar, Crown, Eyebrow, ChalkLine, TEAM_COLORS, TEAM_EMOJIS } from "./bits.jsx";

const MODALITIES = [
  { id: "pvp", label: "Técnicos × Técnicos", desc: "Os XI montados se enfrentam" },
  { id: "cup", label: "Copa vs Seleções", desc: "Enfrente seleções reais" },
];
const DIFFICULTIES = [
  { id: "classic", label: "Clássico", desc: "Notas visíveis" },
  { id: "almanac", label: "De Almanaque", desc: "Notas ocultas" },
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

  function copy() {
    navigator.clipboard?.writeText(state.code).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {}
    );
  }

  function addLocal() {
    const n = prompt("Nome do técnico:");
    if (n && n.trim()) actions.addLocalPlayer(n.trim());
  }

  return (
    <div className="screen lobby">
      <Eyebrow accent>Sala aberta</Eyebrow>
      <div className="code-board">
        <div className="code-board-label">Código da sala</div>
        <div className="code-value">{state.code}</div>
        <button className="btn btn-ghost btn-sm" onClick={copy}>
          {copied ? "✓ Copiado" : "Copiar"}
        </button>
        {isLocal && <span className="tag tag-local">modo local</span>}
      </div>
      {!isLocal && (
        <p className="hint center">Compartilhe esse código. Quem tiver ele entra direto, sem cadastro.</p>
      )}

      {hostOffline && !isHost && (
        <div className="banner banner-warn">
          O anfitrião saiu.{" "}
          <button className="linkbtn" onClick={actions.claimHost}>Assumir o comando</button>
        </div>
      )}

      <ChalkLine label={`técnicos (${state.players.length})`} />

      <div className="roster">
        {state.players.map((p) => {
          const isOnline = isLocal ? true : onlineSet.has(p.id);
          const mine = p.id === myId;
          return (
            <div key={p.id} className={`roster-card ${mine ? "mine" : ""}`}>
              <Avatar emoji={p.emoji} color={p.color} size={44} online={isLocal ? null : isOnline} />
              <div className="roster-info">
                <div className="roster-team">
                  {p.teamName}
                  {state.hostId === p.id && <Crown />}
                </div>
                <div className="roster-name">
                  {p.name}
                  {mine && <span className="tag tag-you">você</span>}
                </div>
              </div>
              {p.isBot && <span className="tag tag-bot">BOT</span>}
              {mine && (
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing((v) => !v)}>
                  {editing ? "Fechar" : "Editar"}
                </button>
              )}
              {isHost && (p.isBot || p.id.startsWith("local_")) && (
                <button className="roster-x" title="Remover" onClick={() => actions.removePlayer(p.id)}>×</button>
              )}
            </div>
          );
        })}
      </div>

      {editing && me && (
        <div className="card edit-card">
          <label className="field">
            <span className="field-label">Nome do time</span>
            <input
              className="input"
              maxLength={20}
              value={me.teamName}
              onChange={(e) => actions.updateMe({ teamName: e.target.value })}
            />
          </label>
          <div className="field-label">Escudo</div>
          <div className="picker-grid">
            {TEAM_EMOJIS.map((em) => (
              <button
                key={em}
                className={`picker-emoji ${me.emoji === em ? "sel" : ""}`}
                onClick={() => actions.updateMe({ emoji: em })}
              >
                {em}
              </button>
            ))}
          </div>
          <div className="field-label">Cor</div>
          <div className="picker-row">
            {TEAM_COLORS.map((c) => (
              <button
                key={c}
                className={`picker-color ${me.color === c ? "sel" : ""}`}
                style={{ background: c }}
                onClick={() => actions.updateMe({ color: c })}
              />
            ))}
          </div>
        </div>
      )}

      {(isLocal || isHost) && (
        <div className="lobby-add">
          {isLocal && <button className="btn btn-ghost" onClick={addLocal}>+ Técnico</button>}
          {isHost && <button className="btn btn-ghost" onClick={actions.addBot}>+ Seleção 🌍</button>}
        </div>
      )}
      {isHost && state.players.length === 1 && (
        <p className="hint center">Jogue sozinho: adicione seleções reais (Brasil 2022, Argentina 1986…) como adversárias. 🌍</p>
      )}

      <ChalkLine label="modalidade" />
      <div className="opt-grid">
        {MODALITIES.map((m) => (
          <button
            key={m.id}
            className={`opt ${(state.settings.modality || "pvp") === m.id ? "sel" : ""} ${!isHost ? "locked" : ""}`}
            disabled={!isHost}
            onClick={() => isHost && actions.setSettings({ modality: m.id })}
          >
            <span className="opt-title">{m.label}</span>
            <span className="opt-desc">{m.desc}</span>
          </button>
        ))}
      </div>

      <ChalkLine label="dificuldade do draft" />
      <div className="opt-grid">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.id}
            className={`opt ${(state.settings.difficulty || "classic") === d.id ? "sel" : ""} ${!isHost ? "locked" : ""}`}
            disabled={!isHost}
            onClick={() => isHost && actions.setSettings({ difficulty: d.id })}
          >
            <span className="opt-title">{d.label}</span>
            <span className="opt-desc">{d.desc}</span>
          </button>
        ))}
      </div>

      <div className="field-label" style={{ marginTop: 14 }}>Tempo por escolha</div>
      <div className="seg">
        {TIMERS.map((t) => (
          <button
            key={t.id}
            className={`seg-item ${(state.settings.turnTimer ?? 30) === t.id ? "sel" : ""}`}
            disabled={!isHost}
            onClick={() => isHost && actions.setSettings({ turnTimer: t.id })}
          >
            <strong>{t.label}</strong>
          </button>
        ))}
      </div>

      {!isHost && <p className="hint center">Só o anfitrião ajusta as configurações e inicia o draft.</p>}

      <div className="sticky-actions">
        {isHost ? (
          <button className="btn btn-primary btn-block btn-lg" onClick={actions.startDraft} disabled={!canStart}>
            {canStart ? "Iniciar Draft ⚽" : "Esperando mais um técnico…"}
          </button>
        ) : (
          <div className="waiting">Aguardando o anfitrião iniciar o draft…</div>
        )}
        <button className="btn btn-ghost btn-block" onClick={actions.leave}>Sair da sala</button>
      </div>
    </div>
  );
}
