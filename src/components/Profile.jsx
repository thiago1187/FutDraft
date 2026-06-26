import { useEffect, useState } from "react";
import { Avatar, TEAM_EMOJIS, TEAM_COLORS } from "./bits.jsx";
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

  useEffect(() => {
    setTeamName(profile?.team_name || "");
    setEmoji(profile?.emoji || TEAM_EMOJIS[0]);
    setColor(profile?.color || TEAM_COLORS[0]);
  }, [profile]);

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
            <div className="profile-pick-label">Escudo</div>
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

// ---------- Estatísticas ----------
function StatsRow({ stats }) {
  const s = stats || {};
  const gf = s.goals_for ?? 0, ga = s.goals_against ?? 0;
  const items = [
    ["Jogos", s.matches_played ?? 0],
    ["Vitórias", s.wins ?? 0],
    ["Empates", s.draws ?? 0],
    ["Derrotas", s.losses ?? 0],
    ["Gols pró", gf],
    ["Gols contra", ga],
    ["Saldo", (gf - ga > 0 ? "+" : "") + (gf - ga)],
    ["Títulos", s.titles ?? 0],
  ];
  return (
    <div className="profile-stats">
      {items.map(([label, val]) => (
        <div className="profile-stat" key={label}>
          <div className="profile-stat-val">{val}</div>
          <div className="profile-stat-label">{label}</div>
        </div>
      ))}
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
