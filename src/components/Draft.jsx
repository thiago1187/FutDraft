import { useMemo, useState } from "react";
import { POSITIONS, POS_LABEL } from "../engine/players.js";
import { countryName } from "../engine/playersData.js";
import { draftInfo } from "../engine/draft.js";
import { Avatar, PosBadge, Ovr, Eyebrow, ChalkLine } from "./bits.jsx";

export default function Draft({ state, myId, isLocal, actions }) {
  const [filter, setFilter] = useState("ALL");
  const [country, setCountry] = useState("ALL");
  const [cup, setCup] = useState("ALL");
  const [query, setQuery] = useState("");

  const d = state.draft;
  const info = draftInfo(d, state.players.length);
  const pickedSet = new Set(d.pickedSet);

  const currentPicker = state.players.find((p) => p.id === info.currentPickerId);
  const myTurn = isLocal || info.currentPickerId === myId;
  const canAct = myTurn;

  // de quem é o elenco em foco: em modo local, o do técnico da vez; senão, o meu
  const focusId = isLocal ? info.currentPickerId : myId;
  const focusPlayer = state.players.find((p) => p.id === focusId);
  const mySquad = (d.picks[focusId] || []).map((pid) => state.pool.find((p) => p.id === pid)).filter(Boolean);

  const posCount = useMemo(() => {
    const c = { GK: 0, DEF: 0, MID: 0, ATT: 0 };
    mySquad.forEach((p) => (c[p.pos] = (c[p.pos] || 0) + 1));
    return c;
  }, [mySquad]);

  // opções de país e copa derivadas do que ainda está disponível
  const { countryOpts, cupOpts } = useMemo(() => {
    const cset = new Set();
    const yset = new Set();
    state.pool.forEach((p) => {
      if (pickedSet.has(p.id)) return;
      cset.add(p.country);
      yset.add(p.cup);
    });
    return {
      countryOpts: [...cset].sort((a, b) => countryName(a).localeCompare(countryName(b))),
      cupOpts: [...yset].sort((a, b) => a - b),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pool, d.pickedSet]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.pool
      .filter((p) => !pickedSet.has(p.id))
      .filter((p) => filter === "ALL" || p.pos === filter)
      .filter((p) => country === "ALL" || p.country === country)
      .filter((p) => cup === "ALL" || p.cup === Number(cup))
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => b.ovr - a.ovr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.pool, d.pickedSet, filter, country, cup, query]);

  return (
    <div className="screen draft">
      <div className="draft-head">
        <Eyebrow accent>
          Rodada {info.round} de {info.rounds} · Escolha {info.pick}/{info.total}
        </Eyebrow>
        <h1 className="screen-title">Draft de Craques</h1>
      </div>

      <div className={`turn-bar ${myTurn ? "you" : ""}`}>
        {currentPicker && (
          <Avatar emoji={currentPicker.emoji} color={currentPicker.color} size={34} />
        )}
        <div className="turn-text">
          {myTurn ? (
            <strong>Sua vez de escolher!</strong>
          ) : (
            <>
              <strong>{currentPicker?.teamName}</strong> está escolhendo…
            </>
          )}
        </div>
        <span className="turn-dir">{info.direction === "down" ? "↓" : "↑"}</span>
      </div>

      {/* Ordem do draft */}
      <div className="snake-strip">
        {state.players.map((p) => (
          <span
            key={p.id}
            className={`snake-chip ${p.id === info.currentPickerId ? "active" : ""}`}
            style={{ "--c": p.color }}
            title={p.teamName}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Elenco em foco */}
      <div className="squad-panel">
        <div className="squad-panel-head">
          <span>
            Elenco de <strong>{focusPlayer?.teamName}</strong>
          </span>
          <span className="squad-count">{mySquad.length}/{state.settings.squadSize}</span>
        </div>
        <div className="pos-counts">
          {POSITIONS.map((pos) => (
            <span key={pos} className="pos-count">
              <PosBadge pos={pos} small /> {posCount[pos]}
            </span>
          ))}
        </div>
        <div className="squad-chips">
          {mySquad.length === 0 && <span className="muted">Nenhum jogador ainda.</span>}
          {mySquad.map((p) => (
            <span key={p.id} className="squad-chip" title={`${p.detail} · ${countryName(p.country)} ${p.cup}`}>
              <span className="chip-flag">{p.flag}</span>
              <PosBadge pos={p.pos} small /> {p.name} <Ovr value={p.ovr} />
            </span>
          ))}
        </div>
      </div>

      <ChalkLine label="jogadores disponíveis" />

      <div className="filters">
        <button className={`filter ${filter === "ALL" ? "sel" : ""}`} onClick={() => setFilter("ALL")}>
          Todos
        </button>
        {POSITIONS.map((pos) => (
          <button key={pos} className={`filter ${filter === pos ? "sel" : ""}`} onClick={() => setFilter(pos)} title={POS_LABEL[pos]}>
            {pos}
          </button>
        ))}
      </div>

      <div className="filters-row">
        <input
          className="input input-sm draft-search"
          placeholder="Buscar craque…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="ALL">🌍 País</option>
          {countryOpts.map((c) => (
            <option key={c} value={c}>{countryName(c)}</option>
          ))}
        </select>
        <select className="select-sm" value={cup} onChange={(e) => setCup(e.target.value)}>
          <option value="ALL">🏆 Copa</option>
          {cupOpts.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="pool-list">
        {available.slice(0, 80).map((p) => (
          <div key={p.id} className="pool-row">
            <span className="pool-flag" title={countryName(p.country)}>{p.flag}</span>
            <PosBadge pos={p.pos} />
            <span className="pool-name">
              {p.name}
              <span className="pool-meta">{p.detail} · Copa {p.cup}</span>
            </span>
            <Ovr value={p.ovr} />
            <button className="btn btn-primary btn-xs" disabled={!canAct} onClick={() => actions.pick(p.id)}>
              Escolher
            </button>
          </div>
        ))}
        {available.length === 0 && <p className="muted center">Nenhum craque com esses filtros.</p>}
      </div>

      {!myTurn && !isLocal && (
        <p className="hint center">Aguarde sua vez — a tela atualiza sozinha quando chegar.</p>
      )}
    </div>
  );
}
