import { useMemo, useState } from "react";
import { formationsFor, findFormation, autoLineup, resolveLineup } from "../engine/formations.js";
import { countryName } from "../engine/playersData.js";
import { POS_COLOR } from "../engine/players.js";
import { Avatar, Ovr, PosBadge, Eyebrow, ChalkLine } from "./bits.jsx";

function squadOf(state, managerId) {
  const ids = state.draft?.picks[managerId] || [];
  return ids.map((pid) => state.pool.find((p) => p.id === pid)).filter(Boolean);
}

export default function Lineup({ state, myId, isLocal, isHost, actions }) {
  const squadSize = state.settings.squadSize;
  // No modo local, um aparelho escala todos os humanos; online, cada um escala o seu.
  // Bots se escalam sozinhos, então não aparecem para edição.
  const editable = (isLocal ? state.players : state.players.filter((p) => p.id === myId)).filter((p) => !p.isBot);
  const [editId, setEditId] = useState(editable[0]?.id || myId);
  const [selSlot, setSelSlot] = useState(null);

  const editPlayer = state.players.find((p) => p.id === editId) || editable[0];
  const squad = useMemo(() => squadOf(state, editId), [state, editId]);
  const resolved = resolveLineup(squad, squadSize, editPlayer?.lineup);
  const formation = resolved.formation;
  const assign = resolved.assign;

  const byId = useMemo(() => Object.fromEntries(squad.map((p) => [p.id, p])), [squad]);
  const benchIds = squad.map((p) => p.id).filter((id) => !Object.values(assign).includes(id));

  const allReady = state.players.every((p) => p.lineup?.ready);
  const notReady = state.players.filter((p) => !p.lineup?.ready);

  function save(newAssign, formationName = formation.name, ready = editPlayer?.lineup?.ready) {
    actions.setLineup(editId, { formation: formationName, assign: newAssign, ready });
  }

  function changeFormation(name) {
    const f = findFormation(squadSize, name);
    const auto = autoLineup(squad, f);
    setSelSlot(null);
    save(auto.assign, name, editPlayer?.lineup?.ready);
  }

  function tapSlot(si) {
    if (selSlot == null) {
      setSelSlot(si);
      return;
    }
    if (selSlot === si) {
      setSelSlot(null);
      return;
    }
    // troca os jogadores de dois slots
    const na = { ...assign };
    const a = na[selSlot];
    na[selSlot] = na[si];
    na[si] = a;
    if (na[selSlot] == null) delete na[selSlot];
    if (na[si] == null) delete na[si];
    setSelSlot(null);
    save(na);
  }

  function tapBench(pid) {
    if (selSlot == null) return; // escolha um slot primeiro
    const na = { ...assign };
    na[selSlot] = pid; // o antigo titular volta automaticamente para o banco
    setSelSlot(null);
    save(na);
  }

  function toggleReady() {
    actions.setLineup(editId, {
      formation: formation.name,
      assign,
      ready: !editPlayer?.lineup?.ready,
    });
  }

  return (
    <div className="screen lineup">
      <Eyebrow accent>Monte sua escalação</Eyebrow>
      <h1 className="screen-title">Escalação & Esquema</h1>

      {isLocal && (
        <div className="lineup-switch">
          {editable.map((p) => (
            <button
              key={p.id}
              className={`team-tab ${p.id === editId ? "sel" : ""}`}
              style={{ "--c": p.color }}
              onClick={() => { setEditId(p.id); setSelSlot(null); }}
            >
              {p.emoji} {p.teamName}
              {p.lineup?.ready && <span className="tab-ok">✓</span>}
            </button>
          ))}
        </div>
      )}

      <div className="formation-bar">
        {formationsFor(squadSize).map((f) => (
          <button
            key={f.name}
            className={`formation-opt ${f.name === formation.name ? "sel" : ""}`}
            onClick={() => changeFormation(f.name)}
          >
            {f.name}
          </button>
        ))}
      </div>

      <Pitch
        formation={formation}
        assign={assign}
        byId={byId}
        selSlot={selSlot}
        teamColor={editPlayer?.color}
        onTapSlot={tapSlot}
      />

      <p className="hint center">
        {selSlot == null
          ? "Toque numa posição para movê-la ou trocar por alguém do banco."
          : "Agora toque em outra posição (troca) ou num reserva (entra no time)."}
      </p>

      <ChalkLine label={`banco (${benchIds.length})`} />
      <div className="bench-list">
        {benchIds.length === 0 && <span className="muted">Sem reservas — elenco do tamanho exato.</span>}
        {benchIds.map((id) => {
          const p = byId[id];
          if (!p) return null;
          return (
            <button
              key={id}
              className={`bench-row ${selSlot != null ? "active" : ""}`}
              onClick={() => tapBench(id)}
              disabled={selSlot == null}
            >
              <span className="pool-flag">{p.flag}</span>
              <PosBadge pos={p.pos} small />
              <span className="pool-name">{p.name}</span>
              <Ovr value={p.ovr} />
            </button>
          );
        })}
      </div>

      <div className="sticky-actions">
        <button
          className={`btn btn-block btn-lg ${editPlayer?.lineup?.ready ? "btn-ghost" : "btn-primary"}`}
          onClick={toggleReady}
        >
          {editPlayer?.lineup?.ready ? "✓ Pronto (tocar para editar)" : "Confirmar escalação"}
        </button>

        {isHost && (
          <button
            className="btn btn-primary btn-block btn-lg"
            onClick={actions.startTournament}
            disabled={!allReady}
          >
            {allReady ? "Iniciar a Copa ⚽" : `Aguardando ${notReady.length} técnico(s)…`}
          </button>
        )}
        {!isHost && (
          <div className="waiting">
            {allReady ? "Tudo pronto! Aguardando o anfitrião iniciar…" : "Confirme sua escalação e aguarde os demais."}
          </div>
        )}
      </div>
    </div>
  );
}

function Pitch({ formation, assign, byId, selSlot, teamColor, onTapSlot }) {
  return (
    <div className="lineup-pitch">
      <div className="lp-grass" />
      <svg className="lp-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="0.5">
          <rect x="2" y="2" width="96" height="96" />
          <line x1="2" y1="50" x2="98" y2="50" />
          <circle cx="50" cy="50" r="11" />
          <rect x="32" y="2" width="36" height="14" />
          <rect x="32" y="84" width="36" height="14" />
        </g>
      </svg>
      {formation.slots.map((slot, si) => {
        const pid = assign[si];
        const p = pid ? byId[pid] : null;
        // y: 0 = nossa defesa (embaixo), 100 = ataque (em cima)
        const left = `${slot.x}%`;
        const bottom = `${slot.y}%`;
        const color = p ? POS_COLOR[p.pos] : "#789";
        return (
          <button
            key={si}
            className={`lp-slot ${selSlot === si ? "sel" : ""} ${p ? "" : "empty"}`}
            style={{ left, bottom, "--c": teamColor || color }}
            onClick={() => onTapSlot(si)}
            title={p ? `${p.name} (${p.detail})` : slot.group}
          >
            <span className="lp-disc" style={{ background: color }}>
              {p ? p.flag : slot.group}
            </span>
            {p && (
              <span className="lp-tag">
                <span className="lp-name">{shortName(p.name)}</span>
                <span className="lp-ovr">{p.ovr}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function shortName(name) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0];
  return parts[parts.length - 1];
}
