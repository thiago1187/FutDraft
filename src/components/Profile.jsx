import { useEffect, useState } from "react";
import { Avatar, TEAM_EMOJIS, TEAM_COLORS, TEAM_FLAGS, flagUrl } from "./bits.jsx";
import { updateMyProfile } from "../lib/auth.js";
import {
  getStats, searchProfiles, listFriendships, sendFriendRequest,
  acceptFriend, removeFriendship, headToHead, isOnline, roomsJoinable,
} from "../lib/social.js";
import { createInvite } from "../lib/invites.js";

// "visto há X" a partir de um timestamp (presença dos amigos).
function timeAgo(ts) {
  if (!ts) return "";
  const ms = Date.now() - new Date(ts).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export default function Profile({ myId, profile, onClose, onProfileChange, onEnterRoom, myRoom }) {
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [] });
  const [roomStatus, setRoomStatus] = useState({}); // code -> { joinable, reason } das salas dos amigos
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const [s, f] = await Promise.all([getStats(myId), listFriendships(myId)]);
      setStats(s);
      setFriends(f);
      // Bloco B — joinabilidade das salas onde os amigos estão AGORA (pra "Entrar na sala").
      const codes = f.friends.map((x) => x.profile?.current_room).filter(Boolean);
      setRoomStatus(codes.length ? await roomsJoinable(codes).catch(() => ({})) : {});
    } catch (e) {
      setNotice(e?.message || "Falha ao carregar.");
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [myId]);

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
        roomStatus={roomStatus}
        myRoom={myRoom}
        onEnterRoom={onEnterRoom}
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
function FriendsPanel({ myId, friends, roomStatus, myRoom, onEnterRoom, setNotice, refresh }) {
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
            <FriendCard
              key={f.friendshipId}
              myId={myId}
              f={f}
              roomStatus={roomStatus}
              myRoom={myRoom}
              onEnterRoom={onEnterRoom}
              onRemove={() => act(removeFriendship, f.friendshipId)}
              setNotice={setNotice}
            />
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

// Pílula de presença: 🎮 em sala (online + current_room), online (verde) ou visto há X.
function PresencePill({ online, inRoom, lastSeen }) {
  if (inRoom) return <span className="friend-pill in-room">🎮 em sala</span>;
  if (online) return <span className="friend-pill on">● online</span>;
  return <span className="friend-pill off">{lastSeen ? `visto ${timeAgo(lastSeen)}` : "offline"}</span>;
}

// Amigo vivo: presença + ações (entrar na sala / convidar / desafiar) + confronto sob demanda.
function FriendCard({ myId, f, roomStatus, myRoom, onEnterRoom, onRemove, setNotice }) {
  const [h2h, setH2h] = useState(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(""); // "invite" | "challenge" — feedback do botão

  const p = f.profile || {};
  const online = isOnline(p.last_seen);
  const inRoom = online && !!p.current_room;
  const rs = inRoom ? roomStatus?.[p.current_room] : null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !h2h) {
      try { setH2h(await headToHead(myId, p.id)); }
      catch (e) { setNotice(e?.message || "Falha no confronto."); }
    }
  }

  async function invite(kind) {
    try {
      await createInvite({ fromId: myId, toId: p.id, kind, roomId: kind === "invite" ? myRoom?.code : null });
      setSent(kind);
      setTimeout(() => setSent(""), 2500);
    } catch (e) { setNotice(e?.message || "Não foi possível enviar."); }
  }

  return (
    <div className="friend-card">
      <div className="friend-row">
        <Avatar emoji={p.emoji} color={p.color} size={36} online={online} />
        <div className="friend-meta">
          <div className="friend-name">@{p.username} <PresencePill online={online} inRoom={inRoom} lastSeen={p.last_seen} /></div>
          <div className="friend-team">{p.team_name || ""}</div>
        </div>
        <span className="friend-h2h-toggle" onClick={toggle} style={{ cursor: "pointer" }}>{open ? "▲" : "Confronto ▾"}</span>
      </div>

      <div className="friend-actions">
        {inRoom && rs && (
          <button
            className="btn btn-primary btn-sm"
            disabled={!rs.joinable}
            title={rs.joinable ? `Entrar na sala ${p.current_room}` : (rs.reason || "Sala indisponível")}
            onClick={() => rs.joinable && onEnterRoom?.(p.current_room)}
          >
            {rs.joinable ? "Entrar na sala" : (rs.reason || "Sala fechada")}
          </button>
        )}
        {myRoom?.code && (
          <button className="btn btn-amber btn-sm" disabled={sent === "invite"} onClick={() => invite("invite")}>
            {sent === "invite" ? "Convite enviado ✓" : "Convidar p/ sala"}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" disabled={sent === "challenge"} onClick={() => invite("challenge")}>
          {sent === "challenge" ? "Desafio enviado ✓" : "Desafiar"}
        </button>
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
