import { useEffect, useMemo, useRef, useState } from "react";
import { findFormation, formationsFor, ROLE_LABEL } from "../engine/formations.js";
import { SQUAD_BY_ID, rollableSquads } from "../data/squads.js";
import { compatibleSlots, isPickable, freePlayers } from "../engine/draft7a0.js";
import { teamRatings } from "../engine/match.js";
import { POS_COLOR } from "../engine/players.js";
import { Flag } from "./bits.jsx";

const POS_RANK = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

export default function Draft7a0({ state, myId, isLocal, isHost, actions }) {
  const draft = state.draft;
  const humans = state.players.filter((p) => !p.isBot);
  const editable = isLocal ? humans : humans.filter((p) => p.id === myId);

  const firstActive = editable.find((p) => !draft.mgr[p.id]?.done) || editable[0];
  const [editId, setEditId] = useState(firstActive?.id || myId);
  const me = state.players.find((p) => p.id === editId);
  const mgr = draft.mgr[editId];
  const formation = findFormation(11, mgr?.formation);
  const taken = useMemo(() => new Set(draft.taken), [draft.taken]);
  const difficulty = draft.difficulty;
  const hideRatings = difficulty === "almanac";

  const [selPlayer, setSelPlayer] = useState(null); // jogador escolhido na lista
  const [moveFrom, setMoveFrom] = useState(null); // slot de origem ao mover
  const [rolling, setRolling] = useState(false); // animação de roleta do sorteio
  const [flickSquad, setFlickSquad] = useState(null); // seleção piscando durante a roleta
  const spinRef = useRef(null);

  const filledCount = mgr ? Object.values(mgr.slots).filter(Boolean).length : 0;
  const filledPlayers = useMemo(() => {
    if (!mgr) return [];
    return Object.values(mgr.slots).map((id) => playerOf(id)).filter(Boolean);
  }, [mgr]);

  // sorteio atual
  const curSquad = mgr?.current?.squadId ? SQUAD_BY_ID[mgr.current.squadId] : null;
  const rollFree = mgr?.current ? freePlayers(mgr.current.squadId, taken) : [];

  function dispatch(intent) {
    actions.dispatchDraft({ ...intent, managerId: editId });
  }

  // Roleta de sorteio: aplica o reroll e pisca seleções/anos aleatórios
  // desacelerando até revelar a seleção realmente sorteada.
  function reroll(kind) {
    if (rolling || mgr.rerollsLeft <= 0) return;
    dispatch({ kind: "reroll", rerollKind: kind });
    setSelPlayer(null);
    setMoveFrom(null);
    let pool = rollableSquads(draft.pool);
    if (!pool.length) pool = Object.values(SQUAD_BY_ID);
    if (!pool.length) return;
    clearTimeout(spinRef.current);
    setRolling(true);
    let i = 0;
    const steps = 16;
    const tick = () => {
      setFlickSquad(pool[Math.floor(Math.random() * pool.length)]);
      i++;
      if (i >= steps) {
        setRolling(false);
        setFlickSquad(null);
        return;
      }
      const t = i / steps;
      spinRef.current = setTimeout(tick, 45 + Math.round(t * t * 150)); // desacelera no fim
    };
    tick();
  }

  // troca de técnico (modo local) ou desmontagem cancela a roleta
  useEffect(() => {
    clearTimeout(spinRef.current);
    setRolling(false);
    setFlickSquad(null);
    return () => clearTimeout(spinRef.current);
  }, [editId]);

  // ---- turn timer (do técnico em foco, se não terminou) ----
  const [secs, setSecs] = useState(draft.turnTimer || 30);
  const tickRef = useRef();
  useEffect(() => {
    setSecs(draft.turnTimer || 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filledCount, editId]);
  useEffect(() => {
    if (!mgr || mgr.done || rolling) return; // pausa o relógio durante a roleta
    clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          dispatch({ kind: "auto" });
          return draft.turnTimer || 30;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mgr?.done, editId, filledCount, rolling]);

  if (!mgr) return <div className="screen draft7"><p className="muted center">Carregando draft…</p></div>;

  const myDone = mgr.done;
  const compat = selPlayer ? compatibleSlots(selPlayer, formation, mgr.slots) : [];

  function pickPlayer(p) {
    if (!isPickable(p, formation, mgr.slots, taken)) return;
    setMoveFrom(null);
    setSelPlayer((cur) => (cur?.id === p.id ? null : p));
  }
  function placeInSlot(slotIndex) {
    // mover um titular para outro slot
    if (moveFrom != null) {
      if (slotIndex !== moveFrom) dispatch({ kind: "move", from: moveFrom, to: slotIndex });
      setMoveFrom(null);
      return;
    }
    if (selPlayer && compat.includes(slotIndex)) {
      dispatch({ kind: "pick", playerId: selPlayer.id, slotIndex });
      setSelPlayer(null);
    }
  }
  function tapFilledSlot(slotIndex) {
    setSelPlayer(null);
    setMoveFrom((cur) => (cur === slotIndex ? null : slotIndex));
  }
  function escalar() {
    if (selPlayer && compat.length) {
      dispatch({ kind: "pick", playerId: selPlayer.id, slotIndex: compat[0] });
      setSelPlayer(null);
    }
  }

  const ratings = filledPlayers.length ? teamRatings(filledPlayers) : null;
  const overall = filledPlayers.length ? Math.round(filledPlayers.reduce((s, p) => s + p.ovr, 0) / filledPlayers.length) : 0;
  // Em Almanaque os ratings ficam ocultos durante a escolha (às cegas); ao completar
  // o time, revela o OVR de cada um e o overall geral.
  const showOvr = !hideRatings || myDone;
  // Progresso de cada técnico humano, em tempo real (quem já fechou o XI e quem falta).
  const humanProgress = humans.map((p) => {
    const m = draft.mgr[p.id];
    const filled = m ? Object.values(m.slots).filter(Boolean).length : 0;
    const total = findFormation(11, m?.formation).slots.length;
    return { id: p.id, name: p.teamName, emoji: p.emoji, filled, total, done: !!(m?.done || filled >= total) };
  });

  return (
    <div className="screen draft7">
      {/* HEADER */}
      <div className="d7-head">
        <div>
          <div className="d7-eyebrow">Draft · {filledCount}/11 escalados {difficulty === "almanac" ? "· Almanaque" : "· Clássico"}</div>
          <h1 className="d7-title">{myDone ? `${me?.teamName} pronto!` : `Sua vez, ${me?.name?.replace(/^CPU\s*/, "") || "técnico"}`}</h1>
        </div>
        {isLocal && editable.length > 1 && (
          <div className="d7-switch">
            {editable.map((p) => (
              <button key={p.id} className={`d7-tab ${p.id === editId ? "sel" : ""}`} onClick={() => { setEditId(p.id); setSelPlayer(null); setMoveFrom(null); }}>
                {p.emoji} {p.teamName}{draft.mgr[p.id]?.done && " ✓"}
              </button>
            ))}
          </div>
        )}
        {!myDone && (
          <div className="d7-timer">
            <span className="d7-timer-label">Tempo p/ escolher</span>
            <span className={`d7-timer-num ${secs <= 5 ? "low" : ""}`}>0:{String(secs).padStart(2, "0")}</span>
          </div>
        )}
      </div>

      <div className="d7-cols">
        {/* LEFT — sorteio + lista */}
        <div className="d7-left">
          {myDone ? (
            <div className="d7-complete">
              <div className="d7-complete-big">11/11</div>
              <div className="d7-complete-sub">Escalação completa!</div>
              <div className="d7-complete-ovr">Overall do time <b>{overall || "—"}</b></div>
              {humanProgress.length > 1 && (
                <div className="d7-progress">
                  <div className="d7-progress-label">Times em tempo real</div>
                  {humanProgress.map((h) => (
                    <div key={h.id} className={`d7-progress-row ${h.done ? "done" : ""}`}>
                      <span className="d7-progress-name">{h.name}</span>
                      <span className="d7-progress-count">{h.done ? "Pronto ✓" : `${h.filled}/${h.total}`}</span>
                    </div>
                  ))}
                </div>
              )}
              {humanProgress.length <= 1 && <p className="muted center">Pronto para começar!</p>}
            </div>
          ) : (
            <>
              <FormationBar mgr={mgr} formation={formation} canChange={filledCount === 0} onChange={(name) => dispatch({ kind: "formation", formation: name })} />
              {(() => {
                const show = rolling && flickSquad ? flickSquad : curSquad;
                if (!show) return null;
                return (
                  <div className={`d7-rolled ${rolling ? "rolling" : ""}`}>
                    <span className="d7-rolled-eyebrow">{rolling ? "Sorteando…" : "Saiu"}</span>
                    <div className="d7-rolled-team">
                      <Flag iso2={show.iso2} src={show.flagSrc} emoji={show.flag} className="d7-rolled-flag" />
                      <span className="d7-rolled-country">{show.country}</span>
                    </div>
                    <div className="d7-rolled-cup">Copa {show.year}</div>
                  </div>
                );
              })()}
              <div className="d7-reroll-label">Não curtiu? Re-sorteie · {mgr.rerollsLeft} restante(s)</div>
              <div className="d7-reroll">
                <button className="d7-reroll-btn" disabled={rolling || mgr.rerollsLeft <= 0} onClick={() => reroll("country")}>↺ Outra seleção</button>
                <button className="d7-reroll-btn" disabled={rolling || mgr.rerollsLeft <= 0} onClick={() => reroll("cup")}>↺ Outra copa</button>
              </div>

              {rolling ? (
                <div className="d7-rolling-msg">Sorteando…</div>
              ) : (
                <>
                  <div className="d7-pick-label">
                    Escolha um jogador
                    {rollFree.length > 0 && <span className="d7-pick-count">{rollFree.length} disponíveis</span>}
                  </div>
                  <div className="d7-list">
                    {rollFree.length === 0 && <div className="d7-list-empty muted">Todos dessa seleção já foram levados. Re-sorteie!</div>}
                    {rollFree
                      .slice()
                      .sort((a, b) => {
                        const pa = isPickable(a, formation, mgr.slots, taken) ? 0 : 1;
                        const pb = isPickable(b, formation, mgr.slots, taken) ? 0 : 1;
                        if (pa !== pb) return pa - pb;
                        if (a.pos !== b.pos) return POS_RANK[a.pos] - POS_RANK[b.pos];
                        return b.ovr - a.ovr;
                      })
                      .map((p) => {
                        const pickable = isPickable(p, formation, mgr.slots, taken);
                        return (
                          <button
                            key={p.id}
                            className={`d7-row ${selPlayer?.id === p.id ? "sel" : ""} ${pickable ? "" : "off"}`}
                            disabled={!pickable}
                            onClick={() => pickPlayer(p)}
                          >
                            <span className="d7-row-name">{p.name}</span>
                            <span className="d7-row-role">{posLabel(p)}</span>
                            {!hideRatings && <span className="d7-row-ovr">{p.ovr}</span>}
                            {hideRatings && <span className="d7-row-ovr hidden">??</span>}
                          </button>
                        );
                      })}
                  </div>
                  <button className="btn btn-primary btn-block btn-lg d7-escalar" disabled={!selPlayer || compat.length === 0} onClick={escalar}>
                    {selPlayer ? `Escalar ${selPlayer.name}` : "Escolha um jogador"}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* CENTER — campo com slots */}
        <div className="d7-center">
          <DraftPitch
            formation={formation}
            slots={mgr.slots}
            playerOf={playerOf}
            selPlayer={selPlayer}
            compat={compat}
            moveFrom={moveFrom}
            onTapSlot={(i) => (mgr.slots[i] != null ? tapFilledSlot(i) : placeInSlot(i))}
          />
          <div className="d7-hint">
            {moveFrom != null ? "Toque num slot vazio para mover o jogador." : selPlayer ? "Toque num slot destacado para posicionar." : "Toque num titular para mudar de posição."}
          </div>
        </div>

        {/* RIGHT — box score */}
        <div className="d7-right">
          <div className="d7-box-head">
            <span className="d7-box-eyebrow">Box score · {filledCount}/11</span>
            <span className="d7-box-big">{showOvr ? (overall || "—") : "—"}</span>
          </div>
          {ratings && showOvr && (
            <div className="d7-box-bars">
              <span><i className="bar-atk" /> Ataque <b>{Math.round(ratings.attack)}</b></span>
              <span><i className="bar-def" /> Defesa <b>{Math.round(ratings.defense)}</b></span>
            </div>
          )}
          <div className="d7-box-list">
            {formation.slots.map((slot, i) => {
              const p = playerOf(mgr.slots[i]);
              return (
                <div key={i} className={`d7-box-row ${p ? "" : "empty"}`}>
                  <span className="d7-box-role">{slot.role}</span>
                  <span className="d7-box-name">{p ? p.name : "—"}</span>
                  {p && <Flag iso2={p.iso2} src={p.flagSrc} emoji={p.flag} className="d7-box-flag" />}
                  {p && showOvr && <span className="d7-box-ovr">{p.ovr}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function playerOf(id) {
  if (!id) return null;
  for (const s of Object.values(SQUAD_BY_ID)) {
    const p = s.players.find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}

function shortRole(p) {
  return p.pos === "GK" ? "GOL" : p.pos === "DEF" ? "ZAG" : p.pos === "MID" ? "MEI" : "ATA";
}

// Posições jogáveis do jogador (ex.: "MEI|PE|CA"). Usa os roles reais do banco;
// cai no grupo amplo se não houver (dados estáticos do modo dev).
function posLabel(p) {
  return p.roles && p.roles.length ? p.roles.join("|") : shortRole(p);
}

function FormationBar({ mgr, formation, canChange, onChange }) {
  return (
    <div className="d7-formation">
      <span className="d7-formation-label">Formação</span>
      <div className="d7-formation-opts">
        {formationsFor().map((f) => (
          <button
            key={f.name}
            className={`d7-formation-opt ${f.name === formation.name ? "sel" : ""}`}
            disabled={!canChange && f.name !== formation.name}
            onClick={() => canChange && onChange(f.name)}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DraftPitch({ formation, slots, playerOf, selPlayer, compat, moveFrom, onTapSlot }) {
  return (
    <div className="d7-pitch">
      <div className="d7-pitch-grass" />
      <svg className="d7-pitch-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="0.5">
          <rect x="2" y="2" width="96" height="96" />
          <line x1="2" y1="50" x2="98" y2="50" />
          <circle cx="50" cy="50" r="12" />
          <rect x="28" y="2" width="44" height="14" />
          <rect x="28" y="84" width="44" height="14" />
        </g>
      </svg>
      {formation.slots.map((slot, i) => {
        const p = playerOf(slots[i]);
        const left = `${slot.x}%`;
        const bottom = `${slot.y}%`;
        const highlight = (selPlayer && compat.includes(i)) || moveFrom === i;
        if (p) {
          return (
            <button key={i} className={`d7-slot filled ${moveFrom === i ? "moving" : ""}`} style={{ left, bottom }} onClick={() => onTapSlot(i)}>
              <span className="d7-disc" style={{ borderColor: POS_COLOR[p.pos] }}>
                <Flag iso2={p.iso2} src={p.flagSrc} emoji={p.flag} className="d7-disc-flag" round />
              </span>
              <span className="d7-disc-name">{lastName(p.name)}</span>
            </button>
          );
        }
        return (
          <button key={i} className={`d7-slot empty ${highlight ? "hi" : ""}`} style={{ left, bottom }} onClick={() => onTapSlot(i)}>
            <span className="d7-slot-circle">{slot.role}</span>
          </button>
        );
      })}
    </div>
  );
}

function lastName(name) {
  const parts = name.split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}
