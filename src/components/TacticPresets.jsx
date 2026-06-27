import { useEffect, useState } from "react";
import { listMyPresets, createPreset, updatePreset, deletePreset, setDefaultPreset } from "../lib/tacticsPresets.js";

// Presets de tática do perfil: criar/editar/excluir e marcar 1 como padrão. Cobre as 5
// alavancas de time; a marcação individual fica de fora (é escolha por adversário, ao vivo).
const POSTURES = [["defensivo", "Defensivo"], ["equilibrado", "Equilibrado"], ["ofensivo", "Ofensivo"]];
const LINES = [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]];
const MARKING = [["leve", "Leve"], ["pressao", "Pressão alta"]];
const ATTACK = [["esq", "Esquerda"], ["meio", "Meio"], ["dir", "Direita"]];
const DEFAULT_T = { posture: "equilibrado", line: "media", marking: "leve", build: 0.4, attackSide: "meio" };

const lbl = (opts, v) => opts.find(([val]) => val === v)?.[1] || "—";
function summary(t = {}) {
  const b = t.build ?? 0.4;
  return [
    lbl(POSTURES, t.posture),
    `Linha ${lbl(LINES, t.line).toLowerCase()}`,
    b < 0.45 ? "Toque" : b > 0.55 ? "Direto" : "Equilíbrio",
    lbl(MARKING, t.marking),
    `Ataque ${lbl(ATTACK, t.attackSide || "meio").toLowerCase()}`,
  ].join(" · ");
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

function Editor({ initial, busy, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || "");
  const [t, setT] = useState({ ...DEFAULT_T, ...(initial?.tactics || {}) });
  const set = (k, v) => setT((p) => ({ ...p, [k]: v }));
  const build = t.build ?? 0.4;

  return (
    <div className="preset-editor">
      <input
        className="home-name-input"
        value={name}
        maxLength={40}
        placeholder="Nome do preset (ex.: Meu gegenpress)"
        onChange={(e) => setName(e.target.value)}
      />
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
      <div className="preset-editor-actions">
        <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => onSave(name, t)}>{busy ? "Salvando…" : "Salvar preset"}</button>
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  );
}

export default function TacticPresets({ setNotice }) {
  const [presets, setPresets] = useState(null); // null = carregando
  const [editing, setEditing] = useState(null); // null | "new" | preset
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try { setPresets(await listMyPresets()); }
    catch (e) { setNotice?.(e?.message || "Falha ao carregar presets."); setPresets([]); }
  }
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(fn) {
    setBusy(true);
    try { await fn(); await refresh(); setEditing(null); }
    catch (e) { setNotice?.(e?.message || "Não foi possível salvar."); }
    finally { setBusy(false); }
  }
  const onCreate = (name, t) => run(() => createPreset(name, t));
  const onEdit = (id, name, t) => run(() => updatePreset(id, { name, tactics: t }));

  return (
    <div className="profile-presets">
      <div className="profile-presets-head">
        <h3 className="profile-section-title">Minhas táticas</h3>
        {editing == null && (
          <button className="btn btn-amber btn-sm" onClick={() => setEditing("new")}>＋ Novo preset</button>
        )}
      </div>

      {editing === "new" && <Editor busy={busy} onSave={onCreate} onCancel={() => setEditing(null)} />}

      {presets == null ? (
        <div className="muted profile-mini">Carregando…</div>
      ) : presets.length === 0 && editing !== "new" ? (
        <div className="muted profile-mini">Você ainda não salvou nenhuma tática. Crie um preset e ele aparece como atalho na tela de tática da partida.</div>
      ) : (
        <div className="preset-list">
          {presets.map((p) => (
            editing && editing.id === p.id ? (
              <Editor key={p.id} initial={p} busy={busy} onSave={(name, t) => onEdit(p.id, name, t)} onCancel={() => setEditing(null)} />
            ) : (
              <div className="preset-row" key={p.id}>
                <div className="preset-meta">
                  <div className="preset-name">{p.name}{p.is_default && <span className="preset-default">⭐ padrão</span>}</div>
                  <div className="preset-summary">{summary(p.tactics)}</div>
                </div>
                <div className="preset-actions">
                  {!p.is_default && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => run(() => setDefaultPreset(p.id))} title="Usar como padrão">★</button>}
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(p)}>Editar</button>
                  <button className="btn btn-ghost btn-sm preset-del" disabled={busy} onClick={() => run(() => deletePreset(p.id))} title="Excluir">✕</button>
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
