import { useEffect, useState } from "react";
import { Avatar, Ovr } from "./bits.jsx";
import { listMyTactics } from "../lib/savedTactics.js";
import { buildTeam } from "../engine/team.js";
import { teamRatings } from "../engine/match.js";

// Sobrenome (ou último token) pra caber no card do time.
function lastName(n) {
  const s = String(n || "").trim().split(/\s+/);
  return s[s.length - 1] || n;
}

// Força do time montado no draft: Geral / Ataque / Defesa + a formação com o over de
// cada jogador. Mesma fonte do motor (buildTeam + teamRatings) — bate com a simulação.
function TeamStrength({ state, player, showName }) {
  const team = buildTeam(state, player.id);
  const xi = team.squad || [];
  if (!xi.length) return null;
  const r = teamRatings(xi);
  const formName = team.lineup?.formation?.name || "";
  const LINES = [["ATA", "ATT"], ["MEI", "MID"], ["ZAG", "DEF"], ["GOL", "GK"]];
  return (
    <div className="ready-team">
      <div className="ready-team-head">
        <span className="ready-team-title">{showName ? player.teamName : "Seu time"}</span>
        {formName && <span className="ready-team-form">{formName}</span>}
      </div>
      <div className="team-ovr-row">
        <div className="team-ovr"><b>{Math.round(r.overall)}</b><span>Geral</span></div>
        <div className="team-ovr atk"><b>{Math.round(r.attack)}</b><span>Ataque</span></div>
        <div className="team-ovr def"><b>{Math.round(r.defense)}</b><span>Defesa</span></div>
      </div>
      <div className="team-lineup">
        {LINES.map(([label, pos]) => {
          const ps = xi.filter((p) => p.pos === pos).sort((a, b) => b.ovr - a.ovr);
          if (!ps.length) return null;
          return (
            <div className="team-line" key={label}>
              <span className="team-line-label">{label}</span>
              <div className="team-line-players">
                {ps.map((p) => (
                  <div className="team-player" key={p.id}>
                    <Ovr value={p.ovr} />
                    <span className="team-player-name">{lastName(p.name)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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

        {players.filter(mine).map((p) => (
          <TeamStrength key={p.id} state={state} player={p} showName={humans.filter(mine).length > 1} />
        ))}

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
