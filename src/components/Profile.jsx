import { useEffect, useState } from "react";
import { Avatar, TEAM_EMOJIS, TEAM_COLORS, TEAM_FLAGS, flagUrl } from "./bits.jsx";
import { updateMyProfile } from "../lib/auth.js";
import {
  getStats, searchProfiles, listFriendships, sendFriendRequest,
  acceptFriend, removeFriendship, headToHead,
} from "../lib/social.js";

export default function Profile({ myId, profile, onClose, onProfileChange }) {
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const [s, f] = await Promise.all([getStats(myId), listFriendships(myId)]);
      setStats(s);
      setFriends(f);
    } catch (e) {
      setNotice(e?.message || "Falha ao carregar.");
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [myId]);

  return (
    <div className="screen profile-screen">
      <div className="profile-top">
        <button className="btn btn-ghost" onClick={onClose}>← Voltar</button>
        <h2 className="profile-title">Meu perfil</h2>
        <span />
      </div>

      <MyCard profile={profile} stats={stats} onProfileChange={onProfileChange} setNotice={setNotice} />

      <StatsRow stats={stats} />

      <FriendsPanel
        myId={myId}
        friends={friends}
        busy={busy}
        setBusy={setBusy}
        setNotice={setNotice}
        refresh={refresh}
      />

      {notice && <div className="profile-notice">{notice}</div>}
    </div>
  );
}

// ---------- Card do jogador + edição ----------
function MyCard({ profile, onProfileChange, setNotice }) {
  const [editing, setEditing] = useState(false);
  const [teamName, setTeamName] = useState(profile?.team_name || "");
  const [emoji, setEmoji] = useState(profile?.emoji || TEAM_EMOJIS[0]);
  const [color, setColor] = useState(profile?.color || TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);

  // Inicializa os campos AO ABRIR o editor — não a cada mudança de `profile`, senão
  // uma atualização de `profile` (ex.: refresh de sessão) apagaria o que você digita.
  useEffect(() => {
    if (!editing) return;
    setTeamName(profile?.team_name || "");
    setEmoji(profile?.emoji || TEAM_EMOJIS[0]);
    setColor(profile?.color || TEAM_COLORS[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateMyProfile({ team_name: teamName.trim(), emoji, color });
      onProfileChange?.(updated);
      setEditing(false);
    } catch (e) {
      setNotice(e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-card">
      <Avatar emoji={editing ? emoji : profile?.emoji} color={editing ? color : profile?.color} size={84} />
      <div className="profile-card-main">
        <div className="profile-username">@{profile?.username}</div>
        {!editing ? (
          <>
            <div className="profile-team">{profile?.team_name || "Sem time definido"}</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Editar perfil</button>
          </>
        ) : (
          <div className="profile-edit">
            <input
              className="home-name-input"
              value={teamName}
              maxLength={22}
              placeholder="Nome do time"
              onChange={(e) => setTeamName(e.target.value)}
            />
            <div className="profile-pick-label">Escudo · bandeiras</div>
            <div className="profile-emoji-grid profile-flag-grid">
              {TEAM_FLAGS.map((code) => {
                const val = "fl:" + code;
                return (
                  <button key={code} className={"profile-emoji" + (emoji === val ? " is-on" : "")} onClick={() => setEmoji(val)}>
                    <img className="profile-flag" src={flagUrl(code)} alt={code} loading="lazy" />
                  </button>
                );
              })}
            </div>
            <div className="profile-pick-label">Escudo · símbolos</div>
            <div className="profile-emoji-grid">
              {TEAM_EMOJIS.map((e) => (
                <button key={e} className={"profile-emoji" + (e === emoji ? " is-on" : "")} onClick={() => setEmoji(e)}>{e}</button>
              ))}
            </div>
            <div className="profile-pick-label">Cor</div>
            <div className="profile-color-grid">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  className={"profile-color" + (c === color ? " is-on" : "")}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <div className="profile-edit-actions">
              <button className="btn btn-primary btn-sm" onClick={save} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)} disabled={saving}>Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Estatísticas (Desempenho) ----------
function StatsRow({ stats }) {
  const s = stats || {};
  const jogos = s.matches_played ?? 0;
  const vitorias = s.wins ?? 0;
  const empates = s.draws ?? 0;
  const derrotas = s.losses ?? 0;
  const golsPro = s.goals_for ?? 0;
  const golsContra = s.goals_against ?? 0;
  const titulos = s.titles ?? 0;

  const saldo = golsPro - golsContra;
  const pontos = vitorias * 3 + empates;
  const pontosMax = jogos * 3;
  const aproveitamento = pontosMax > 0 ? Math.round((pontos / pontosMax) * 100) : 0;

  const R = 62, CIRC = 2 * Math.PI * R;
  const ringOffset = CIRC * (1 - aproveitamento / 100);

  const pct = (n) => (jogos > 0 ? (n / jogos) * 100 : 0);
  const maxGols = Math.max(golsPro, golsContra, 1);
  const proBar = (golsPro / maxGols) * 100;
  const contraBar = (golsContra / maxGols) * 100;
  const mediaPro = jogos > 0 ? (golsPro / jogos).toFixed(1) : "0.0";
  const mediaContra = jogos > 0 ? (golsContra / jogos).toFixed(1) : "0.0";

  const saldoColor = saldo > 0 ? "var(--green)" : saldo < 0 ? "var(--red)" : "var(--ink)";
  const saldoArrow = saldo > 0 ? "▲" : saldo < 0 ? "▼" : "—";
  const tituloLabel = titulos === 1 ? "Título conquistado" : "Títulos conquistados";

  return (
    <div className="perf">
      <div className="perf-head">
        <h3 className="perf-title">Desempenho</h3>
        <span className="perf-tag">Geral</span>
        <div className="perf-rule" />
      </div>

      {/* card hero: medidor + campanha */}
      <div className="perf-hero">
        <div className="perf-gauge">
          <div className="perf-gauge-ring">
            <svg width="150" height="150" viewBox="0 0 150 150" className="perf-gauge-svg">
              <circle cx="75" cy="75" r={R} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="13" />
              <circle
                cx="75" cy="75" r={R} fill="none" stroke="var(--gold)" strokeWidth="13" strokeLinecap="round"
                strokeDasharray={CIRC.toFixed(1)} strokeDashoffset={ringOffset.toFixed(1)}
                style={{ "--circ": CIRC.toFixed(1) }}
              />
            </svg>
            <div className="perf-gauge-val">{aproveitamento}<span>%</span></div>
          </div>
          <div className="perf-gauge-label">Aproveitamento</div>
          <div className="perf-gauge-sub">{pontos} de {pontosMax} pontos</div>
        </div>

        <div className="perf-campaign">
          <div className="perf-campaign-head">
            <span className="perf-cap">Campanha</span>
            <span className="perf-games"><b>{jogos}</b> jogos</span>
          </div>
          <div className="perf-bar">
            <div className="perf-bar-seg seg-v" style={{ width: pct(vitorias) + "%" }} />
            <div className="perf-bar-seg seg-e" style={{ width: pct(empates) + "%" }} />
            <div className="perf-bar-seg seg-d" style={{ width: pct(derrotas) + "%" }} />
          </div>
          <div className="perf-legend">
            <div className="perf-leg leg-v">
              <div className="perf-leg-top"><span className="perf-dot" /><span>Vitórias</span></div>
              <div className="perf-leg-val">{vitorias}</div>
            </div>
            <div className="perf-leg leg-e">
              <div className="perf-leg-top"><span className="perf-dot" /><span>Empates</span></div>
              <div className="perf-leg-val">{empates}</div>
            </div>
            <div className="perf-leg leg-d">
              <div className="perf-leg-top"><span className="perf-dot" /><span>Derrotas</span></div>
              <div className="perf-leg-val">{derrotas}</div>
            </div>
          </div>
        </div>
      </div>

      {/* grade: gols + conquistas */}
      <div className="perf-grid">
        <div className="perf-goals">
          <div className="perf-goals-head">
            <span className="perf-cap">Gols</span>
            <span className="perf-goals-avg">{mediaPro} marcados · {mediaContra} sofridos / jogo</span>
          </div>
          <div className="perf-goals-row">
            <span className="perf-goals-tag tag-pro">Pró</span>
            <div className="perf-goals-track"><div className="perf-goals-fill fill-pro" style={{ width: proBar + "%" }} /></div>
            <span className="perf-goals-num num-pro">{golsPro}</span>
          </div>
          <div className="perf-goals-row">
            <span className="perf-goals-tag tag-contra">Contra</span>
            <div className="perf-goals-track"><div className="perf-goals-fill fill-contra" style={{ width: contraBar + "%" }} /></div>
            <span className="perf-goals-num num-contra">{golsContra}</span>
          </div>
          <div className="perf-saldo">
            <span className="perf-cap">Saldo de gols</span>
            <span className="perf-saldo-val" style={{ color: saldoColor }}>{saldoArrow} {saldo}</span>
          </div>
        </div>

        <div className="perf-titles">
          <div className="perf-titles-head">
            <span className="perf-cap perf-cap-light">Conquistas</span>
            <span className="perf-trophy">🏆</span>
          </div>
          <div className="perf-titles-mid">
            <div className="perf-titles-num">{titulos}</div>
            <div className="perf-titles-label">{tituloLabel}</div>
          </div>
          <div className="perf-titles-chips">
            <div className="perf-chip"><div className="perf-chip-val">{jogos}</div><div className="perf-chip-label">Jogos</div></div>
            <div className="perf-chip"><div className="perf-chip-val">{pontos}</div><div className="perf-chip-label">Pontos</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Amigos ----------
function FriendsPanel({ myId, friends, setNotice, refresh }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  async function doSearch(q) {
    setQuery(q);
    if (q.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try { setResults(await searchProfiles(q, myId)); }
    catch (e) { setNotice(e?.message || "Falha na busca."); }
    finally { setSearching(false); }
  }

  async function act(fn, ...args) {
    try { await fn(...args); await refresh(); }
    catch (e) { setNotice(e?.message || "Falha na ação."); }
  }

  const knownIds = new Set([
    ...friends.friends.map((f) => f.profile?.id),
    ...friends.incoming.map((f) => f.profile?.id),
    ...friends.outgoing.map((f) => f.profile?.id),
  ]);

  return (
    <div className="profile-friends">
      <h3 className="profile-section-title">Amigos</h3>

      <div className="friend-search">
        <input
          className="home-name-input"
          value={query}
          placeholder="Buscar por usuário…"
          autoCapitalize="none"
          onChange={(e) => doSearch(e.target.value)}
        />
      </div>
      {searching && <div className="muted profile-mini">Buscando…</div>}
      {results.length > 0 && (
        <div className="friend-list">
          {results.map((p) => (
            <div className="friend-row" key={p.id}>
              <Avatar emoji={p.emoji} color={p.color} size={36} />
              <div className="friend-meta">
                <div className="friend-name">@{p.username}</div>
                <div className="friend-team">{p.team_name || ""}</div>
              </div>
              {knownIds.has(p.id) ? (
                <span className="friend-badge">já adicionado</span>
              ) : (
                <button className="btn btn-amber btn-sm" onClick={() => act(sendFriendRequest, myId, p.id)}>Adicionar</button>
              )}
            </div>
          ))}
        </div>
      )}

      {friends.incoming.length > 0 && (
        <>
          <div className="profile-subtitle">Pedidos recebidos</div>
          <div className="friend-list">
            {friends.incoming.map((f) => (
              <div className="friend-row" key={f.friendshipId}>
                <Avatar emoji={f.profile?.emoji} color={f.profile?.color} size={36} />
                <div className="friend-meta">
                  <div className="friend-name">@{f.profile?.username}</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => act(acceptFriend, f.friendshipId)}>Aceitar</button>
                <button className="btn btn-ghost btn-sm" onClick={() => act(removeFriendship, f.friendshipId)}>Recusar</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="profile-subtitle">Meus amigos ({friends.friends.length})</div>
      {friends.friends.length === 0 ? (
        <div className="muted profile-mini">Você ainda não tem amigos adicionados.</div>
      ) : (
        <div className="friend-list">
          {friends.friends.map((f) => (
            <FriendCard key={f.friendshipId} myId={myId} f={f} onRemove={() => act(removeFriendship, f.friendshipId)} setNotice={setNotice} />
          ))}
        </div>
      )}

      {friends.outgoing.length > 0 && (
        <>
          <div className="profile-subtitle">Pedidos enviados</div>
          <div className="friend-list">
            {friends.outgoing.map((f) => (
              <div className="friend-row" key={f.friendshipId}>
                <Avatar emoji={f.profile?.emoji} color={f.profile?.color} size={36} />
                <div className="friend-meta"><div className="friend-name">@{f.profile?.username}</div></div>
                <span className="friend-badge">pendente</span>
                <button className="btn btn-ghost btn-sm" onClick={() => act(removeFriendship, f.friendshipId)}>Cancelar</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Amigo com confronto direto sob demanda.
function FriendCard({ myId, f, onRemove, setNotice }) {
  const [h2h, setH2h] = useState(null);
  const [open, setOpen] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !h2h) {
      try { setH2h(await headToHead(myId, f.profile.id)); }
      catch (e) { setNotice(e?.message || "Falha no confronto."); }
    }
  }

  return (
    <div className="friend-card">
      <div className="friend-row" onClick={toggle} style={{ cursor: "pointer" }}>
        <Avatar emoji={f.profile?.emoji} color={f.profile?.color} size={36} />
        <div className="friend-meta">
          <div className="friend-name">@{f.profile?.username}</div>
          <div className="friend-team">{f.profile?.team_name || ""}</div>
        </div>
        <span className="friend-h2h-toggle">{open ? "▲" : "Confronto ▾"}</span>
      </div>
      {open && (
        <div className="friend-h2h">
          {!h2h ? (
            <span className="muted profile-mini">Carregando…</span>
          ) : Number(h2h.matches_played) === 0 ? (
            <span className="muted profile-mini">Vocês ainda não se enfrentaram.</span>
          ) : (
            <div className="h2h-grid">
              <div className="h2h-cell"><b>{h2h.a_wins}</b><span>suas vitórias</span></div>
              <div className="h2h-cell"><b>{h2h.draws}</b><span>empates</span></div>
              <div className="h2h-cell"><b>{h2h.b_wins}</b><span>dele(a)</span></div>
              <div className="h2h-cell"><b>{h2h.a_goals}-{h2h.b_goals}</b><span>gols (você-ele)</span></div>
            </div>
          )}
          <button className="btn btn-ghost btn-sm friend-remove" onClick={onRemove}>Remover amigo</button>
        </div>
      )}
    </div>
  );
}
