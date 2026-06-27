import { supabase, hasSupabase } from "./supabase.js";
import { clientId } from "./id.js";

export { hasSupabase };

const TABLE = "rooms";

// Abre (ou cria) uma sala. Online = relacional (rooms + room_players, Realtime por tabela);
// o estado "de motor" (draft/torneio em andamento) fica num jsonb enxuto rooms.state
// (transitório — o schema ainda não modela o sorteio em curso nem o chaveamento).
export async function openRoom(code, opts = {}) {
  if (hasSupabase) return openSupabaseRoom(code, opts);
  return openLocalRoom(code, opts);
}

export async function roomExists(code) {
  if (!hasSupabase) {
    return Boolean(localStorage.getItem("futdraft_local_" + code));
  }
  const { data, error } = await supabase.from(TABLE).select("id").eq("id", code).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// ---------------- SALA ONLINE (relacional) ----------------
const PLAYER_COLS =
  "id, room_id, user_id, slot, is_bot, squad_slug, team_name, emoji, color, ready, joined_at, " +
  "profile:profiles!room_players_user_id_fkey(username, display_name)";

function mapPlayer(r) {
  return {
    id: r.user_id || r.id, // humano = uid; bot/local = id da linha
    rowId: r.id,
    name: r.is_bot ? "CPU" : r.profile?.display_name || r.team_name || "Técnico",
    teamName: r.team_name || r.profile?.team_name || "Time",
    emoji: r.emoji || "⚽",
    color: r.color || "#8a8470",
    isBot: !!r.is_bot,
    squadId: r.squad_slug || undefined,
    ready: !!r.ready,
    slot: r.slot,
    joinedAt: r.joined_at,
  };
}

async function openSupabaseRoom(code, { create = false, initialState = null, myUid, profile = {}, presenceMeta = {} }) {
  const uid = myUid || null;
  let roomRow = null;
  let players = [];
  const stateCbs = new Set();
  const presCbs = new Set();
  const bcastCbs = new Set();
  let online = [];
  let channel = null;

  const meRow = () => ({
    room_id: code,
    user_id: uid,
    is_bot: false,
    team_name: profile.team_name || profile.teamName || "Meu Time",
    emoji: profile.emoji || "⚽",
    color: profile.color || "#2b5ba8",
    ready: false,
  });

  if (create) {
    const init = initialState || {};
    const { error: rerr } = await supabase.from(TABLE).upsert({
      id: code,
      code,
      host_id: uid,
      phase: init.phase || "lobby",
      settings: init.settings || {},
      status: "active",
      state: { draft: null, tournament: null, presenting: null, tournamentToken: null },
      updated_at: new Date().toISOString(),
    });
    if (rerr) throw rerr;
    const { error: perr } = await supabase.from("room_players").insert({ ...meRow(), slot: 0 });
    if (perr && !isDup(perr)) throw perr;
  } else {
    const { data, error } = await supabase.from(TABLE).select("id").eq("id", code).maybeSingle();
    if (error) throw error;
    if (!data) { const e = new Error("not_found"); e.code = "not_found"; throw e; }
    // entra como jogador (se ainda não estiver na sala)
    if (uid) {
      const { data: mine } = await supabase.from("room_players").select("id").eq("room_id", code).eq("user_id", uid).maybeSingle();
      if (!mine) {
        const { error: perr } = await supabase.from("room_players").insert(meRow());
        if (perr && !isDup(perr)) throw perr;
      }
    }
  }

  async function reloadRoom() {
    const { data } = await supabase.from(TABLE).select("id, code, host_id, phase, settings, status, state").eq("id", code).maybeSingle();
    roomRow = data || roomRow;
  }
  async function reloadPlayers() {
    const { data } = await supabase.from("room_players").select(PLAYER_COLS).eq("room_id", code);
    players = (data || []).slice().sort((a, b) => {
      const sa = a.slot ?? 999, sb = b.slot ?? 999;
      if (sa !== sb) return sa - sb;
      return new Date(a.joined_at) - new Date(b.joined_at);
    }).map(mapPlayer);
  }

  await Promise.all([reloadRoom(), reloadPlayers()]);

  function assemble() {
    const st = roomRow?.state || {};
    return {
      v: 1,
      code,
      hostId: roomRow?.host_id || null,
      phase: roomRow?.phase || "lobby",
      settings: roomRow?.settings || {},
      players,
      draft: st.draft || null,
      tournament: st.tournament || null,
      presenting: st.presenting || null,
      tournamentToken: st.tournamentToken || null,
      draftToken: st.draftToken || null,
    };
  }
  const emit = () => { const s = assemble(); stateCbs.forEach((cb) => cb(s)); };

  channel = supabase.channel("room_" + code, {
    config: { presence: { key: clientId() }, broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "fd" }, (msg) => {
    const p = msg.payload || {};
    bcastCbs.forEach((cb) => cb(p.event, p.data, p.from));
  });
  channel.on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `id=eq.${code}` }, async () => {
    await reloadRoom();
    emit();
  });
  channel.on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${code}` }, async () => {
    await reloadPlayers();
    emit();
  });
  channel.on("presence", { event: "sync" }, () => {
    online = Object.keys(channel.presenceState());
    presCbs.forEach((cb) => cb(online));
  });

  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout ao conectar")), 12000);
      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timer);
          await channel.track(presenceMeta || {});
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timer);
          reject(new Error("erro de conexão (" + status + ")"));
        }
      });
    });
  } catch (e) {
    // Sem isso, o canal subscrito-pela-metade fica órfão no cliente e pode reconectar
    // em background, duplicando postgres_changes em retentativas.
    try { await supabase.removeChannel(channel); } catch (_) {}
    throw e;
  }

  // Atualiza rooms (merge) e reflete localmente na hora (otimista).
  async function patchRoom(patch) {
    roomRow = { ...roomRow, ...patch };
    emit();
    const { error } = await supabase.from(TABLE).update({ ...patch, updated_at: new Date().toISOString() }).eq("id", code);
    if (error) console.error("patchRoom:", error.message);
  }

  const room = {
    code,
    isLocal: false,
    getState: assemble,
    getOnline: () => online,
    onChange(cb) { stateCbs.add(cb); return () => stateCbs.delete(cb); },
    onPresence(cb) { presCbs.add(cb); cb(online); return () => presCbs.delete(cb); },

    // ----- meta da sala -----
    setSettings(patch) { return patchRoom({ settings: { ...(roomRow?.settings || {}), ...patch } }); },
    setPhase(phase) { return patchRoom({ phase }); },
    claimHost(newHostId) { return patchRoom({ host_id: newHostId }); },
    // estado de motor (draft/torneio/apresentação) — jsonb enxuto, transitório
    setEngine(patch) {
      const next = { ...(roomRow?.state || {}), ...patch };
      return patchRoom({ state: next });
    },

    // ----- jogadores (room_players) -----
    async addPlayerRow(row) {
      const { error } = await supabase.from("room_players").insert({ room_id: code, ...row });
      if (error && !isDup(error)) console.error("addPlayerRow:", error.message);
    },
    async updatePlayer(playerId, patch) {
      const { error } = await supabase.from("room_players").update(patch).or(`user_id.eq.${playerId},id.eq.${playerId}`).eq("room_id", code);
      if (error) console.error("updatePlayer:", error.message);
    },
    updateMe(patch) {
      if (!uid) return Promise.resolve();
      // Otimista: reflete na hora no estado local. Sem isso, o input controlado do
      // editor reverte a cada tecla (espera o round-trip do Realtime) e as escolhas
      // de bandeira/cor não destacam.
      const local = {};
      if (patch.team_name != null) local.teamName = patch.team_name;
      if (patch.emoji != null) local.emoji = patch.emoji;
      if (patch.color != null) local.color = patch.color;
      if (Object.keys(local).length) {
        players = players.map((p) => (p.id === uid ? { ...p, ...local } : p));
        emit();
      }
      return supabase.from("room_players").update(patch).eq("room_id", code).eq("user_id", uid);
    },
    async removePlayer(playerId) {
      const { error } = await supabase.from("room_players").delete().or(`user_id.eq.${playerId},id.eq.${playerId}`).eq("room_id", code);
      if (error) console.error("removePlayer:", error.message);
    },
    setReady(playerId, val) { return this.updatePlayer(playerId, { ready: !!val }); },

    // ----- canal efêmero (comandos + snapshots ao vivo) -----
    async updatePresence(meta) { if (channel) await channel.track(meta); },
    broadcast(event, data) {
      if (!channel) return;
      channel.send({ type: "broadcast", event: "fd", payload: { event, data, from: clientId() } });
    },
    onBroadcast(cb) { bcastCbs.add(cb); return () => bcastCbs.delete(cb); },

    async leave() {
      try {
        if (uid) await supabase.from("room_players").delete().eq("room_id", code).eq("user_id", uid);
      } catch (_) {}
      try {
        if (channel) { await channel.untrack(); await supabase.removeChannel(channel); }
      } catch (_) {}
      stateCbs.clear(); presCbs.clear(); bcastCbs.clear();
    },
  };
  return room;
}

function isDup(error) {
  return String(error?.message || "").toLowerCase().includes("duplicate") || error?.code === "23505";
}

// ---------------- SALA LOCAL (mesma tela / abas) — segue em blob ----------------
async function openLocalRoom(code, { create = false, initialState = null }) {
  const KEY = "futdraft_local_" + code;
  let _state = null;
  const stateCbs = new Set();

  if (create) {
    _state = initialState;
    localStorage.setItem(KEY, JSON.stringify(initialState));
  } else {
    const raw = localStorage.getItem(KEY);
    _state = raw ? JSON.parse(raw) : initialState;
    if (raw === null && initialState) localStorage.setItem(KEY, JSON.stringify(initialState));
  }

  // Nomeado para poder remover em leave() (sem isso, reentrar acumula listeners órfãos).
  const onStorage = (e) => {
    if (e.key === KEY && e.newValue) {
      _state = JSON.parse(e.newValue);
      stateCbs.forEach((cb) => cb(_state));
    }
  };
  window.addEventListener("storage", onStorage);

  const bcastCbs = new Set();
  let bc = null;
  try {
    bc = new BroadcastChannel("fd_" + code);
    bc.onmessage = (e) => {
      const p = e.data || {};
      bcastCbs.forEach((cb) => cb(p.event, p.data, p.from));
    };
  } catch (_) {}

  return {
    code,
    isLocal: true,
    getState: () => _state,
    getOnline: () => [],
    onChange(cb) { stateCbs.add(cb); return () => stateCbs.delete(cb); },
    onPresence(cb) { cb([]); return () => {}; },
    async setState(next) {
      const value = typeof next === "function" ? next(_state) : next;
      if (value === _state) return value;
      _state = value;
      localStorage.setItem(KEY, JSON.stringify(value));
      stateCbs.forEach((cb) => cb(_state));
      return value;
    },
    async updatePresence() {},
    broadcast(event, data) { if (bc) bc.postMessage({ event, data, from: clientId() }); },
    onBroadcast(cb) { bcastCbs.add(cb); return () => bcastCbs.delete(cb); },
    async leave() {
      stateCbs.clear(); bcastCbs.clear();
      window.removeEventListener("storage", onStorage);
      try { if (bc) bc.close(); } catch (_) {}
    },
  };
}
