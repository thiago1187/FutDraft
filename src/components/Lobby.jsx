import { useState } from "react";
import { Avatar, Crown, TEAM_COLORS, TEAM_EMOJIS, TEAM_FLAGS, flagUrl } from "./bits.jsx";

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
  { id: "almanac", label: "De almanaque", desc: "Notas ocultas" },
];
const TIMERS = [
  { id: 20, label: "20s" },
  { id: 30, label: "30s" },
  { id: 45, label: "45s" },
  { id: 0, label: "∞" },
];
const POOLS = [
  { id: "all", label: "Todas" },
  { id: "strong", label: "Só fortes" },
  { id: "legends", label: "Só lendas" },
];

export default function Lobby({ state, myId, online, isHost, isLocal, actions, hostOffline, squadsReady, squadsError }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const me = state.players.find((p) => p.id === myId);
  const onlineSet = new Set(online);
  const set = state.settings;
  const humanCount = state.players.filter((p) => !p.isBot).length;
  const canStart = humanCount >= 1;
  const isLeague = (set.format || "knockout") === "league";
  const sizeKey = isLeague ? "leagueSize" : "bracketSize";
  const targetSize = isLeague ? (set.leagueSize || 6) : (set.bracketSize || 4);
  const shownTotal = Math.max(targetSize, state.players.length);
  const minSize = Math.max(2, state.players.length); // não dá pra ter menos vagas que jogadores
  const emptySlots = Math.max(0, shownTotal - state.players.length);
  const setSize = (n) => pick({ [sizeKey]: Math.min(16, Math.max(minSize, n)) });
  const usedByOthers = state.players.filter((p) => p.id !== myId).map((p) => p.color);

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
  const pick = (patch) => isHost && actions.setSettings(patch);

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

        {/* configurações — estilo 7a0 (opções visíveis) */}
        <div className="cfg">
          <Seg label="Modalidade" options={MODALITIES} value={set.modality || "pvp"} isHost={isHost} onPick={(v) => pick({ modality: v })} />
          <Seg label="Formato" options={FORMATS} value={set.format || "knockout"} isHost={isHost} onPick={(v) => pick({ format: v })} />
          <Stepper
            label="Número de times"
            value={shownTotal}
            min={minSize}
            max={16}
            isHost={isHost}
            onChange={setSize}
            hint={isLeague ? "Pode ser ímpar — vagas viram CPU ao iniciar." : "Sobras entram com bye — vagas viram CPU ao iniciar."}
          />
          <Seg label="Dificuldade do draft" options={DIFFICULTIES} value={set.difficulty || "classic"} isHost={isHost} onPick={(v) => pick({ difficulty: v })} />
          <Seg label="Seleções no draft" options={POOLS} value={set.squadPool || "all"} isHost={isHost} onPick={(v) => pick({ squadPool: v })} />
          <Seg label="Tempo por jogada" options={TIMERS} value={set.turnTimer ?? 30} isHost={isHost} onPick={(v) => pick({ turnTimer: v })} />
        </div>
        {!isHost && <p className="hint">Só o anfitrião ajusta as configurações.</p>}

        {editing && me && (
          <div className="card edit-card">
            <label className="field">
              <span className="field-label">Nome do time</span>
              <input className="input" maxLength={20} value={me.teamName} onChange={(e) => actions.updateMe({ teamName: e.target.value })} />
            </label>
            <div className="field-label">Escudo · bandeiras</div>
            <div className="picker-grid flags">
              {TEAM_FLAGS.map((code) => {
                const val = "fl:" + code;
                return (
                  <button key={code} className={`picker-emoji ${me.emoji === val ? "sel" : ""}`} onClick={() => actions.updateMe({ emoji: val })}>
                    <img className="picker-flag" src={flagUrl(code)} alt={code} loading="lazy" />
                  </button>
                );
              })}
            </div>
            <div className="field-label">Escudo · símbolos</div>
            <div className="picker-grid">
              {TEAM_EMOJIS.map((em) => (
                <button key={em} className={`picker-emoji ${me.emoji === em ? "sel" : ""}`} onClick={() => actions.updateMe({ emoji: em })}>{em}</button>
              ))}
            </div>
            <div className="field-label">Cor (única na sala)</div>
            <div className="picker-row">
              {TEAM_COLORS.map((c) => {
                const taken = usedByOthers.includes(c);
                return (
                  <button
                    key={c}
                    className={`picker-color ${me.color === c ? "sel" : ""} ${taken ? "taken" : ""}`}
                    style={{ background: c }}
                    disabled={taken}
                    title={taken ? "Cor já usada" : ""}
                    onClick={() => !taken && actions.updateMe({ color: c })}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* DIREITA — técnicos + iniciar */}
      <div className="split-right lobby-right">
        <div className="lobby-right-head">
          <h1 className="screen-title lobby-title">Técnicos na sala</h1>
          <span className="lobby-count"><span className="live-dot" /> {state.players.length}/{shownTotal} times</span>
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
                  <div className="tecnico-name">{p.name}{mine && <span className="tag tag-you">você</span>}{p.isBot && <span className="tag tag-bot">CPU</span>}</div>
                </div>
                {state.hostId === p.id ? (
                  <span className="tag tag-host">Anfitrião</span>
                ) : p.isBot ? (
                  <span className="tecnico-status on">● Pronto</span>
                ) : isOnline ? (
                  <span className="tecnico-status on">● Online</span>
                ) : (
                  <span className="tecnico-status">entrando…</span>
                )}
                {mine && (
                  <button className="btn btn-ghost btn-sm tecnico-edit" onClick={() => setEditing((v) => !v)}>{editing ? "Fechar" : "Editar"}</button>
                )}
                {isHost && p.id !== myId && (
                  <button className="roster-x" title={p.isBot ? "Remover CPU" : "Remover da sala"} onClick={() => actions.removePlayer(p.id)}>×</button>
                )}
              </div>
            );
          })}

          {emptySlots > 0 && Array.from({ length: Math.min(emptySlots, 16) }).map((_, i) => (
            <div className="tecnico-card vaga" key={"v" + i}>
              <span className="vaga-plus">🤖</span>
              <span className="vaga-text">Vaga livre — CPU entra ao iniciar</span>
              {isHost && (
                <button className="roster-x" title="Remover vaga" onClick={() => setSize(shownTotal - 1)}>×</button>
              )}
            </div>
          ))}

          {isHost && shownTotal < 16 && (
            <button className="tecnico-card vaga vaga-add" onClick={() => setSize(shownTotal + 1)}>
              <span className="vaga-plus">＋</span>
              <span className="vaga-text">Adicionar vaga livre (CPU)</span>
            </button>
          )}
        </div>

        {isLocal && (
          <div className="lobby-add">
            <button className="btn btn-ghost" onClick={addLocal}>+ Técnico (mesmo aparelho)</button>
          </div>
        )}
        {!squadsReady && !squadsError && <p className="hint">Carregando seleções do banco…</p>}
        {squadsError && <p className="hint" style={{ color: "var(--red)" }}>Erro ao carregar seleções: {squadsError}</p>}
        {isHost && emptySlots > 0 && squadsReady && (
          <p className="hint">As {emptySlots} vaga(s) restante(s) serão preenchidas por <strong>seleções da CPU aleatórias</strong> ao iniciar. 🤖</p>
        )}

        <div className="lobby-actions">
          {isHost ? (
            <button className="btn btn-primary btn-block btn-xl" onClick={actions.startDraft} disabled={!canStart || !squadsReady}>
              {!squadsReady ? "Carregando seleções…" : "Iniciar Draft"} {canStart && squadsReady && <span className="arr">→</span>}
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

function Stepper({ label, value, min, max, isHost, onChange, hint }) {
  return (
    <div className="cfg-block">
      <div className="cfg-block-label">{label}</div>
      <div className="cfg-stepper">
        <button className="cfg-step-btn" disabled={!isHost || value <= min} onClick={() => isHost && onChange(value - 1)}>−</button>
        <span className="cfg-step-val">{value}</span>
        <button className="cfg-step-btn" disabled={!isHost || value >= max} onClick={() => isHost && onChange(value + 1)}>+</button>
      </div>
      {hint && <span className="cfg-step-hint">{hint}</span>}
    </div>
  );
}

function Seg({ label, options, value, isHost, onPick }) {
  return (
    <div className="cfg-block">
      <div className="cfg-block-label">{label}</div>
      <div className="cfg-opts">
        {options.map((o) => (
          <button
            key={o.id}
            className={`cfg-opt ${value === o.id ? "sel" : ""}`}
            disabled={!isHost}
            onClick={() => isHost && onPick(o.id)}
          >
            <span className="cfg-opt-label">{o.label}</span>
            {o.desc && <span className="cfg-opt-desc">{o.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
