import { useEffect, useState } from "react";
import { Avatar, TEAM_EMOJIS, TEAM_COLORS, TEAM_FLAGS, flagUrl, Flag } from "./bits.jsx";
import { updateMyProfile } from "../lib/auth.js";
import { SQUADS, SQUAD_BY_ID, squadLabel } from "../data/squads.js";
import {
  getStats, searchProfiles, listFriendships, sendFriendRequest,
  acceptFriend, removeFriendship, headToHead, isOnline, roomsJoinable,
  recentMatches, statsFor, getProfileExtras, updateMyExtras, blockFriend, unblockFriend,
} from "../lib/social.js";
import { createInvite } from "../lib/invites.js";
import { listMyTactics, saveTactic, deleteTactic, setDefaultTactic, DEFAULT_TACTIC } from "../lib/savedTactics.js";

// ---- Apelidos locais e favoritos (Bloco E.4): só no aparelho (localStorage). ----
const NICK_KEY = "futdraft_friend_nicks";
const PIN_KEY = "futdraft_friend_pins";
function loadMap(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch { return {}; } }
function saveMap(key, m) { try { localStorage.setItem(key, JSON.stringify(m)); } catch { /* ignora */ } }

// Sequência atual entre os 2 (a partir dos confrontos já ordenados do mais recente).
// Empate quebra a sequência. Retorna { who: "me"|"them"|null, n }.
function computeStreak(matches, myId) {
  let who = null, n = 0;
  for (const m of matches) {
    if (!m.winner_user_id) break;
    const side = m.winner_user_id === myId ? "me" : "them";
    if (who === null) { who = side; n = 1; }
    else if (side === who) n++;
    else break;
  }
  return { who, n };
}

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

export default function Profile({ myId, profile, onClose, onProfileChange, onEnterRoom, myRoom, invites = [], onAcceptInvite, onDeclineInvite }) {
  const [stats, setStats] = useState(null);
  const [friends, setFriends] = useState({ friends: [], incoming: [], outgoing: [], blocked: [] });
  const [roomStatus, setRoomStatus] = useState({}); // code -> { joinable, reason } das salas dos amigos
  const [ranking, setRanking] = useState([]); // Bloco D — círculo (eu + amigos) por títulos/aproveitamento
  const [extras, setExtras] = useState({ bio: "", favorite_squad: null }); // Bloco E — bio + seleção
  const [tactics, setTactics] = useState([]); // Bloco E — presets de tática salvos
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function refresh() {
    try {
      const [s, f, ex, tc] = await Promise.all([
        getStats(myId), listFriendships(myId), getProfileExtras(myId).catch(() => ({})), listMyTactics().catch(() => []),
      ]);
      setStats(s);
      setFriends(f);
      setExtras({ bio: ex?.bio || "", favorite_squad: ex?.favorite_squad || null });
      setTactics(tc);
      // Bloco B — joinabilidade das salas onde os amigos estão AGORA (pra "Entrar na sala").
      const codes = f.friends.map((x) => x.profile?.current_room).filter(Boolean);
      setRoomStatus(codes.length ? await roomsJoinable(codes).catch(() => ({})) : {});
      // Bloco D — ranking do círculo (eu + amigos aceitos) a partir de profile_stats.
      const profById = { [myId]: profile };
      f.friends.forEach((x) => { if (x.profile) profById[x.profile.id] = x.profile; });
      const ids = Object.keys(profById);
      const rows = await statsFor(ids).catch(() => []);
      setRanking(buildRanking(rows, profById, myId));
    } catch (e) {
      setNotice(e?.message || "Falha ao carregar.");
    }
  }
  // Atualização só da PRESENÇA (leve) — mantém online/em sala/visto há X fresquinho
  // enquanto o Perfil está aberto. Evita assinar profiles em realtime (seria um firehose:
  // todo heartbeat de todo usuário; o postgres_changes não filtra por lista de amigos).
  async function refreshPresence() {
    try {
      const f = await listFriendships(myId);
      setFriends(f);
      const codes = f.friends.map((x) => x.profile?.current_room).filter(Boolean);
      setRoomStatus(codes.length ? await roomsJoinable(codes).catch(() => ({})) : {});
    } catch { /* presença é best-effort */ }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, [myId]);
  useEffect(() => {
    const iv = setInterval(() => { refreshPresence(); }, 25_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return (
    <div className="screen profile-screen">
      <div className="profile-top">
        <button className="btn btn-ghost" onClick={onClose}>← Voltar</button>
        <h2 className="profile-title">Meu perfil</h2>
        <span />
      </div>

      <MyCard
        myId={myId}
        profile={profile}
        extras={extras}
        onProfileChange={onProfileChange}
        onExtrasChange={setExtras}
        setNotice={setNotice}
      />

      <StatsRow stats={stats} />

      <InvitesPanel invites={invites} onAccept={onAcceptInvite} onDecline={onDeclineInvite} />

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

      <RankingPanel rows={ranking} myId={myId} />

      <TacticsPresets myId={myId} tactics={tactics} reload={refresh} setNotice={setNotice} />

      {notice && <div className="profile-notice">{notice}</div>}
    </div>
  );
}

// ---------- Ranking entre amigos (Bloco D) ----------
// Monta as linhas do círculo (eu + amigos) a partir de profile_stats + os profiles
// já em mãos (escudo/cor/time). Ordena por títulos, depois aproveitamento (V/J), depois V.
function buildRanking(statRows, profById, myId) {
  const rows = (statRows || []).map((s) => {
    const p = profById[s.user_id] || {};
    const J = Number(s.matches_played) || 0;
    const V = Number(s.wins) || 0;
    const T = Number(s.titles) || 0;
    return {
      id: s.user_id,
      username: p.username || s.username || "—",
      teamName: p.team_name || "",
      emoji: p.emoji, color: p.color,
      J, V, T, rate: J ? V / J : 0, isMe: s.user_id === myId,
    };
  });
  rows.sort((a, b) => b.T - a.T || b.rate - a.rate || b.V - a.V);
  return rows;
}

function RankingPanel({ rows, myId }) {
  if (!rows?.length || (rows.length === 1 && rows[0].id === myId)) return null;
  return (
    <div className="profile-ranking">
      <h3 className="profile-section-title">Ranking entre amigos</h3>
      <div className="rank-table">
        <div className="rank-head">
          <span className="rank-pos">#</span>
          <span className="rank-who">Técnico</span>
          <span className="rank-num" title="Títulos">🏆</span>
          <span className="rank-num" title="Jogos">J</span>
          <span className="rank-num" title="Vitórias">V</span>
          <span className="rank-num" title="Aproveitamento (V/J)">%</span>
        </div>
        {rows.map((r, i) => (
          <div className={`rank-row ${r.isMe ? "me" : ""}`} key={r.id}>
            <span className="rank-pos">{i + 1}</span>
            <span className="rank-who">
              <Avatar emoji={r.emoji} color={r.color} size={22} />
              <span className="rank-name">@{r.username}{r.isMe && <span className="tag tag-you">você</span>}</span>
            </span>
            <span className="rank-num">{r.T}</span>
            <span className="rank-num">{r.J}</span>
            <span className="rank-num">{r.V}</span>
            <span className="rank-num">{Math.round(r.rate * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Busca/seleção da seleção favorita (lê do registry SQUADS carregado pelo App).
function SquadPicker({ value, onPick }) {
  const [q, setQ] = useState("");
  const sel = value ? SQUAD_BY_ID[value] : null;
  const term = q.trim().toLowerCase();
  const list = (term ? SQUADS.filter((s) => squadLabel(s).toLowerCase().includes(term)) : SQUADS).slice(0, 40);
  return (
    <div className="squad-picker">
      <div className="squad-picker-row">
        <input className="home-name-input" value={q} placeholder={sel ? squadLabel(sel) : "Buscar seleção…"} onChange={(e) => setQ(e.target.value)} />
        {value && <button className="btn btn-ghost btn-sm" onClick={() => { onPick(null); setQ(""); }}>Limpar</button>}
      </div>
      <div className="squad-options">
        {list.map((s) => (
          <button key={s.id} type="button" className={"squad-opt" + (value === s.id ? " is-on" : "")} onClick={() => onPick(s.id)}>
            <Flag iso2={s.iso2} src={s.flagSrc} emoji={s.flag} round />
            <span>{squadLabel(s)}</span>
          </button>
        ))}
        {!list.length && <span className="muted profile-mini">Nenhuma seleção (ainda carregando?).</span>}
      </div>
    </div>
  );
}

// ---------- Card do jogador + edição (Bloco E: + nome de técnico, bio, seleção favorita) ----------
function MyCard({ myId, profile, extras, onProfileChange, onExtrasChange, setNotice }) {
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [teamName, setTeamName] = useState(profile?.team_name || "");
  const [emoji, setEmoji] = useState(profile?.emoji || TEAM_EMOJIS[0]);
  const [color, setColor] = useState(profile?.color || TEAM_COLORS[0]);
  const [bio, setBio] = useState("");
  const [favSquad, setFavSquad] = useState(null);
  const [saving, setSaving] = useState(false);

  // Inicializa os campos AO ABRIR o editor — não a cada mudança de `profile`, senão
  // uma atualização de `profile` (ex.: refresh de sessão) apagaria o que você digita.
  useEffect(() => {
    if (!editing) return;
    setDisplayName(profile?.display_name || "");
    setTeamName(profile?.team_name || "");
    setEmoji(profile?.emoji || TEAM_EMOJIS[0]);
    setColor(profile?.color || TEAM_COLORS[0]);
    setBio(extras?.bio || "");
    setFavSquad(extras?.favorite_squad || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateMyProfile({ display_name: displayName.trim(), team_name: teamName.trim(), emoji, color });
      await updateMyExtras(myId, { bio: bio.trim(), favorite_squad: favSquad });
      onProfileChange?.(updated);
      onExtrasChange?.({ bio: bio.trim(), favorite_squad: favSquad });
      setEditing(false);
    } catch (e) {
      setNotice(e?.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  const fav = extras?.favorite_squad ? SQUAD_BY_ID[extras.favorite_squad] : null;

  return (
    <div className="profile-card">
      <Avatar emoji={editing ? emoji : profile?.emoji} color={editing ? color : profile?.color} size={84} />
      <div className="profile-card-main">
        <div className="profile-username">@{profile?.username}</div>
        {!editing ? (
          <>
            {profile?.display_name && <div className="profile-displayname">{profile.display_name}</div>}
            <div className="profile-team">{profile?.team_name || "Sem time definido"}</div>
            {fav && (
              <div className="profile-fav" title="Seleção favorita">
                <Flag iso2={fav.iso2} src={fav.flagSrc} emoji={fav.flag} round />
                <span>{squadLabel(fav)}</span>
              </div>
            )}
            {extras?.bio && <div className="profile-bio">{extras.bio}</div>}
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>Editar perfil</button>
          </>
        ) : (
          <div className="profile-edit">
            <input
              className="home-name-input"
              value={displayName}
              maxLength={18}
              placeholder="Seu nome de técnico"
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="home-name-input"
              value={teamName}
              maxLength={22}
              placeholder="Nome do time"
              onChange={(e) => setTeamName(e.target.value)}
            />
            <textarea
              className="home-name-input profile-bio-input"
              value={bio}
              maxLength={140}
              rows={2}
              placeholder="Bio (curta)…"
              onChange={(e) => setBio(e.target.value)}
            />
            <div className="profile-pick-label">Seleção favorita</div>
            <SquadPicker value={favSquad} onPick={setFavSquad} />
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

// ---------- Convites recebidos (Bloco C) ----------
function InvitesPanel({ invites, onAccept, onDecline }) {
  if (!invites?.length) return null;
  return (
    <div className="profile-invites">
      <h3 className="profile-section-title">Convites <span className="invite-count">{invites.length}</span></h3>
      <div className="friend-list">
        {invites.map((inv) => {
          const from = inv.from || {};
          const isChallenge = inv.kind === "challenge";
          return (
            <div className="friend-row invite-row" key={inv.id}>
              <Avatar emoji={from.emoji} color={from.color} size={36} />
              <div className="friend-meta">
                <div className="friend-name">@{from.username || "amigo"}</div>
                <div className="friend-team">{isChallenge ? "⚔️ Desafiou você" : `📩 Convidou p/ sala ${inv.room_id || ""}`}</div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onAccept?.(inv)}>Aceitar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => onDecline?.(inv)}>Recusar</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Amigos ----------
function FriendsPanel({ myId, friends, roomStatus, myRoom, onEnterRoom, setNotice, refresh }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  // Bloco E.4 — apelido local + fixar no topo (só no aparelho).
  const [nicks, setNicks] = useState(() => loadMap(NICK_KEY));
  const [pins, setPins] = useState(() => loadMap(PIN_KEY));
  function setNick(id, name) { const m = { ...nicks }; if (name) m[id] = name; else delete m[id]; setNicks(m); saveMap(NICK_KEY, m); }
  function togglePin(id) { const m = { ...pins }; if (m[id]) delete m[id]; else m[id] = true; setPins(m); saveMap(PIN_KEY, m); }

  const sortedFriends = [...(friends.friends || [])].sort((a, b) => {
    const pa = pins[a.profile?.id] ? 1 : 0, pb = pins[b.profile?.id] ? 1 : 0;
    if (pa !== pb) return pb - pa; // fixados primeiro
    return (a.profile?.username || "").localeCompare(b.profile?.username || "");
  });

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
          {sortedFriends.map((f) => (
            <FriendCard
              key={f.friendshipId}
              myId={myId}
              f={f}
              roomStatus={roomStatus}
              myRoom={myRoom}
              onEnterRoom={onEnterRoom}
              nick={nicks[f.profile?.id] || ""}
              pinned={!!pins[f.profile?.id]}
              onTogglePin={() => togglePin(f.profile?.id)}
              onSetNick={() => {
                const n = window.prompt("Apelido local para este amigo (vazio remove):", nicks[f.profile?.id] || "");
                if (n !== null) setNick(f.profile?.id, n.trim());
              }}
              onBlock={() => act(blockFriend, f.friendshipId)}
              onRemove={() => act(removeFriendship, f.friendshipId)}
              setNotice={setNotice}
            />
          ))}
        </div>
      )}

      {friends.blocked?.length > 0 && (
        <>
          <div className="profile-subtitle">Bloqueados ({friends.blocked.length})</div>
          <div className="friend-list">
            {friends.blocked.map((f) => (
              <div className="friend-row" key={f.friendshipId}>
                <Avatar emoji={f.profile?.emoji} color={f.profile?.color} size={36} />
                <div className="friend-meta"><div className="friend-name">@{f.profile?.username}</div></div>
                <span className="friend-badge">bloqueado</span>
                <button className="btn btn-ghost btn-sm" onClick={() => act(unblockFriend, f.friendshipId)}>Desbloquear</button>
              </div>
            ))}
          </div>
        </>
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
function FriendCard({ myId, f, roomStatus, myRoom, onEnterRoom, nick, pinned, onTogglePin, onSetNick, onBlock, onRemove, setNotice }) {
  const [h2h, setH2h] = useState(null);
  const [matches, setMatches] = useState(null); // últimos confrontos (Bloco D)
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
      try {
        const [hh, ms] = await Promise.all([headToHead(myId, p.id), recentMatches(myId, p.id, 6)]);
        setH2h(hh);
        setMatches(ms);
      } catch (e) { setNotice(e?.message || "Falha no confronto."); }
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
          <div className="friend-name">
            {pinned && <span className="friend-pin" title="Fixado no topo">📌</span>}
            {nick ? <><b>{nick}</b> <span className="friend-handle">@{p.username}</span></> : <>@{p.username}</>}
            {" "}<PresencePill online={online} inRoom={inRoom} lastSeen={p.last_seen} />
          </div>
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
            <>
              {/* Troféu de freguês: quem lidera o confronto direto (empate técnico = sem selo) */}
              {(() => {
                const a = Number(h2h.a_wins), b = Number(h2h.b_wins);
                if (a === b) return <div className="fregues-badge tie">🤝 Empate técnico no retrospecto</div>;
                return a > b
                  ? <div className="fregues-badge lead">🏆 Você lidera — @{p.username} é seu freguês</div>
                  : <div className="fregues-badge lose">💀 @{p.username} leva a melhor sobre você</div>;
              })()}
              {/* Sequência atual */}
              {(() => {
                const st = computeStreak(matches || [], myId);
                if (!st.n) return null;
                return (
                  <div className={`fregues-streak ${st.who}`}>
                    {st.who === "me" ? "🔥 Você venceu" : "🥶 Ele(a) venceu"} os últimos {st.n} contra {st.who === "me" ? "ele(a)" : "você"}
                  </div>
                );
              })()}
              <div className="h2h-grid">
                <div className="h2h-cell"><b>{h2h.a_wins}</b><span>suas vitórias</span></div>
                <div className="h2h-cell"><b>{h2h.draws}</b><span>empates</span></div>
                <div className="h2h-cell"><b>{h2h.b_wins}</b><span>dele(a)</span></div>
                <div className="h2h-cell"><b>{h2h.a_goals}-{h2h.b_goals}</b><span>gols (você-ele)</span></div>
              </div>
              {matches && matches.length > 0 && (
                <div className="h2h-history">
                  <div className="h2h-history-label">Últimos confrontos</div>
                  {matches.map((m) => {
                    const meHome = m.home_user_id === myId;
                    const my = meHome ? m.home_score : m.away_score;
                    const their = meHome ? m.away_score : m.home_score;
                    const res = m.winner_user_id === myId ? "V" : m.winner_user_id ? "D" : "E";
                    const hasPens = m.home_pens != null && m.away_pens != null;
                    const pens = hasPens ? ` (${meHome ? m.home_pens : m.away_pens}-${meHome ? m.away_pens : m.home_pens} pen)` : "";
                    return (
                      <div className="h2h-hrow" key={m.id}>
                        <span className={`h2h-res ${res}`}>{res}</span>
                        <span className="h2h-score">{my}-{their}{pens}</span>
                        <span className="h2h-date">{new Date(m.played_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
          <div className="friend-manage">
            <button className="btn btn-ghost btn-sm" onClick={onTogglePin}>{pinned ? "Desafixar" : "📌 Fixar"}</button>
            <button className="btn btn-ghost btn-sm" onClick={onSetNick}>Apelido</button>
            <button className="btn btn-ghost btn-sm" onClick={onBlock}>Bloquear</button>
            <button className="btn btn-ghost btn-sm friend-remove" onClick={onRemove}>Remover</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Táticas preferidas (Bloco E.3) ----------
const POSTURE_OPTS = [["defensivo", "Defensivo"], ["equilibrado", "Equilibrado"], ["ofensivo", "Ofensivo"]];
const LINE_OPTS = [["baixa", "Baixa"], ["media", "Média"], ["alta", "Alta"]];
const MARK_OPTS = [["leve", "Leve"], ["pressao", "Pressão alta"]];
const ATK_OPTS = [["esq", "Esquerda"], ["meio", "Meio"], ["dir", "Direita"]];

function tacticSummary(t = {}) {
  const L = {
    posture: { defensivo: "Defensivo", equilibrado: "Equilíbrio", ofensivo: "Ofensivo" },
    line: { baixa: "Linha baixa", media: "Linha média", alta: "Linha alta" },
    marking: { leve: "Marc. leve", pressao: "Pressão alta" },
    attackSide: { esq: "Pela esq.", meio: "Pelo meio", dir: "Pela dir." },
  };
  const parts = [];
  if (t.posture) parts.push(L.posture[t.posture]);
  if (t.line) parts.push(L.line[t.line]);
  if (t.build != null) parts.push(t.build < 0.5 ? "Toque" : "Direto");
  if (t.marking) parts.push(L.marking[t.marking]);
  if (t.attackSide && t.attackSide !== "meio") parts.push(L.attackSide[t.attackSide]);
  return parts.filter(Boolean).join(" · ");
}

function LeverSeg({ label, options, value, onPick }) {
  return (
    <div className="tac-lever">
      <span className="tac-lever-label">{label}</span>
      <div className="tac-lever-opts">
        {options.map(([v, lbl]) => (
          <button key={v} type="button" className={"tac-opt" + (value === v ? " is-on" : "")} onClick={() => onPick(v)}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

function TacticsPresets({ myId, tactics, reload, setNotice }) {
  const [editing, setEditing] = useState(null); // null | "new" | <id>
  const [name, setName] = useState("");
  const [lev, setLev] = useState(DEFAULT_TACTIC);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  function openNew() { setEditing("new"); setName(""); setLev(DEFAULT_TACTIC); setIsDefault(false); }
  function openEdit(t) { setEditing(t.id); setName(t.name || ""); setLev({ ...DEFAULT_TACTIC, ...(t.tactics || {}) }); setIsDefault(!!t.is_default); }
  const set = (k, v) => setLev((p) => ({ ...p, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      await saveTactic({ id: editing === "new" ? undefined : editing, userId: myId, name, tactics: lev, isDefault });
      setEditing(null); await reload();
    } catch (e) { setNotice(e?.message || "Não foi possível salvar o preset."); }
    finally { setSaving(false); }
  }
  async function remove(id) {
    try { await deleteTactic(id); await reload(); }
    catch (e) { setNotice(e?.message || "Falha ao excluir."); }
  }
  async function makeDefault(id) {
    try { await setDefaultTactic(myId, id); await reload(); }
    catch (e) { setNotice(e?.message || "Falha ao definir padrão."); }
  }

  return (
    <div className="profile-tactics">
      <h3 className="profile-section-title">Táticas preferidas</h3>
      {tactics.length === 0 && !editing && (
        <div className="muted profile-mini">Nenhum preset ainda. Crie um para preencher as alavancas rapidinho na partida.</div>
      )}
      {tactics.length > 0 && (
        <div className="tac-list">
          {tactics.map((t) => (
            <div className="tac-row" key={t.id}>
              <div className="tac-row-main">
                <span className="tac-name">{t.name}{t.is_default && <span className="tac-default">padrão</span>}</span>
                <span className="tac-sum">{tacticSummary(t.tactics)}</span>
              </div>
              {!t.is_default && <button className="btn btn-ghost btn-sm" title="Definir como padrão" onClick={() => makeDefault(t.id)}>★</button>}
              <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Editar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => remove(t.id)}>Excluir</button>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <div className="tac-editor">
          <input className="home-name-input" value={name} maxLength={24} placeholder="Nome do preset (ex.: Pressão total)" onChange={(e) => setName(e.target.value)} />
          <LeverSeg label="Postura" options={POSTURE_OPTS} value={lev.posture} onPick={(v) => set("posture", v)} />
          <LeverSeg label="Linha" options={LINE_OPTS} value={lev.line} onPick={(v) => set("line", v)} />
          <div className="tac-lever">
            <span className="tac-lever-label">Posse</span>
            <div className="tac-slider">
              <span className={(lev.build ?? 0.5) < 0.5 ? "on" : ""}>Toque</span>
              <input type="range" min="0" max="100" value={Math.round((lev.build ?? 0.5) * 100)} onChange={(e) => set("build", Number(e.target.value) / 100)} />
              <span className={(lev.build ?? 0.5) >= 0.5 ? "on" : ""}>Direto</span>
            </div>
          </div>
          <LeverSeg label="Pressão" options={MARK_OPTS} value={lev.marking} onPick={(v) => set("marking", v)} />
          <LeverSeg label="Foco de ataque" options={ATK_OPTS} value={lev.attackSide} onPick={(v) => set("attackSide", v)} />
          <label className="tac-default-check">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Usar como padrão
          </label>
          <div className="profile-edit-actions">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={saving || !name.trim()}>{saving ? "Salvando…" : "Salvar preset"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={saving}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-amber btn-sm" onClick={openNew}>+ Novo preset</button>
      )}
    </div>
  );
}
