import { useEffect, useState } from "react";
import { Avatar } from "./bits.jsx";
import { listMyTactics } from "../lib/savedTactics.js";

// Tela de PRONTO pós-draft: cada técnico confirma e, se quiser, já deixa a tática
// definida (vale na 1ª partida dele). A competição só começa quando TODOS confirmam.
const POSTURES = [["defensivo", "Defensivo"], ["equilibrado", "Equilibrado"], ["ofensivo", "Ofensivo"]];
const LINES = [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]];
const MARKING = [["leve", "Leve"], ["pressao", "Pressão alta"]];
const ATTACK = [["esq", "Esquerda"], ["meio", "Meio"], ["dir", "Direita"]];
const DEFAULT_T = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4, attackSide: "meio" };
const LEVERS = ["posture", "line", "build", "marking", "attackSide"];

function pick(t = {}) {
  const out = {};
  for (const k of LEVERS) if (t[k] != null) out[k] = t[k];
  return out;
}

function Seg({ label, options, value, onPick }) {
  return (
    <div className="preset-seg-block">
      <div className="preset-seg-label">{label}</div>
      <div className="preset-seg">
        {options.map(([val, l]) => (
          <button key={val} type="button" className={"preset-seg-item" + (value === val ? " is-on" : "")} onClick={() => onPick(val)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

function TacticModal({ teamName, initial, onClose, onSave }) {
  const [t, setT] = useState({ ...DEFAULT_T, ...pick(initial || {}) });
  const [presets, setPresets] = useState([]);
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const build = t.build ?? 0.4;

  useEffect(() => {
    let alive = true;
    listMyTactics().then((r) => alive && setPresets(r)).catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <div className="lobby-modal" onClick={onClose}>
      <div className="lobby-modal-card ready-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="lobby-modal-head">
          <span className="lobby-modal-title">Tática · {teamName}</span>
          <button className="lobby-modal-x" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        {presets.length > 0 && (
          <div className="ready-modal-presets">
            <div className="preset-seg-label">Carregar preset do perfil</div>
            <div className="mlf-presets">
              {presets.map((p) => (
                <button key={p.id} className="mlf-preset" onClick={() => setT((c) => ({ ...c, ...pick(p.tactics) }))}>
                  {p.is_default ? "⭐ " : ""}{p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <Seg label="Postura" options={POSTURES} value={t.posture} onPick={(v) => set("posture", v)} />
        <Seg label="Linha defensiva" options={LINES} value={t.line} onPick={(v) => set("line", v)} />
        <div className="preset-seg-block">
          <div className="preset-seg-label">Posse de bola</div>
          <div className="preset-slider">
            <span className={build < 0.5 ? "on" : ""}>Toque</span>
            <input type="range" min="0" max="100" value={Math.round(build * 100)} onChange={(e) => set("build", Number(e.target.value) / 100)} />
            <span className={build >= 0.5 ? "on" : ""}>Direto</span>
          </div>
        </div>
        <Seg label="Pressão" options={MARKING} value={t.marking} onPick={(v) => set("marking", v)} />
        <Seg label="Foco de ataque" options={ATTACK} value={t.attackSide || "meio"} onPick={(v) => set("attackSide", v)} />

        <button className="btn btn-primary btn-block" onClick={() => onSave(pick(t))}>Salvar tática</button>
      </div>
    </div>
  );
}

export default function ReadyGate({ state, myId, isLocal, actions }) {
  const players = state.players || [];
  const humans = players.filter((p) => !p.isBot);
  const ready = state.readyMgrs || {};
  const mgrTactics = state.managerTactics || {};
  const [editing, setEditing] = useState(null); // manager (player) sendo editado

  // técnicos que ESTE aparelho confirma: no local, todos os humanos; no online, só eu.
  const mine = (p) => !p.isBot && (isLocal || p.id === myId);
  const readyCount = humans.filter((p) => ready[p.id]).length;
  const allReady = humans.length > 0 && readyCount === humans.length;

  return (
    <div className="screen ready-gate">
      <div className="ready-card">
        <span className="home-kicker">Draft concluído · preparação</span>
        <h1 className="screen-title ready-title">Prontos para começar?</h1>
        <p className="ready-sub">A competição começa quando todos os técnicos confirmarem. Ajuste sua tática agora se quiser — ela já vale na sua 1ª partida.</p>

        <div className="ready-list">
          {players.map((p) => {
            const isReady = p.isBot || ready[p.id];
            const myRow = mine(p);
            const hasTactic = !!mgrTactics[p.id];
            return (
              <div key={p.id} className={"ready-row" + (isReady ? " ok" : "")}>
                <Avatar emoji={p.emoji} color={p.color} size={40} online={null} />
                <div className="ready-meta">
                  <div className="ready-name">
                    {p.teamName}
                    {myRow && <span className="tag tag-you">você</span>}
                    {p.isBot && <span className="tag tag-bot">CPU</span>}
                  </div>
                  <div className="ready-st">{isReady ? "✓ Pronto" : "aguardando…"}{hasTactic && <span className="ready-tactic"> · tática definida</span>}</div>
                </div>
                {myRow && (
                  <div className="ready-row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(p)}>⚙ Tática</button>
                    {!ready[p.id] && <button className="btn btn-primary btn-sm" onClick={() => actions.markReady(p.id)}>Pronto ✓</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="ready-foot">
          {allReady
            ? <div className="waiting">✓ Todos prontos! Começando a competição…</div>
            : <div className="waiting">{readyCount}/{humans.length} técnicos prontos — esperando os demais…</div>}
        </div>
      </div>

      {editing && (
        <TacticModal
          teamName={editing.teamName}
          initial={mgrTactics[editing.id]}
          onClose={() => setEditing(null)}
          onSave={(t) => { actions.setManagerTactics(editing.id, t); setEditing(null); }}
        />
      )}
    </div>
  );
}
