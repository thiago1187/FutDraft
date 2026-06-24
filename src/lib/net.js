import { supabase, hasSupabase } from "./supabase.js";
import { clientId } from "./id.js";

export { hasSupabase };

const TABLE = "rooms";

// Abre (ou cria) uma sala e devolve um objeto com getState / setState / onChange / onPresence / leave.
export async function openRoom(code, opts = {}) {
  if (hasSupabase) return openSupabaseRoom(code, opts);
  return openLocalRoom(code, opts);
}

// Verifica se uma sala existe (apenas online).
export async function roomExists(code) {
  if (!hasSupabase) {
    return Boolean(localStorage.getItem("futdraft_local_" + code));
  }
  const { data, error } = await supabase.from(TABLE).select("id").eq("id", code).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

// ---------------- SALA ONLINE (Supabase) ----------------
async function openSupabaseRoom(code, { create = false, initialState = null, presenceMeta = {} }) {
  let _state = null;
  const stateCbs = new Set();
  const presCbs = new Set();
  let online = [];
  let channel = null;

  if (create) {
    _state = initialState;
    const { error } = await supabase
      .from(TABLE)
      .upsert({ id: code, state: initialState, updated_at: new Date().toISOString() });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from(TABLE).select("state").eq("id", code).maybeSingle();
    if (error) throw error;
    if (!data) {
      const e = new Error("not_found");
      e.code = "not_found";
      throw e;
    }
    _state = data.state;
  }

  const bcastCbs = new Set();

  channel = supabase.channel("room_" + code, {
    config: { presence: { key: clientId() }, broadcast: { self: false } },
  });

  channel.on("broadcast", { event: "fd" }, (msg) => {
    const p = msg.payload || {};
    bcastCbs.forEach((cb) => cb(p.event, p.data, p.from));
  });

  channel.on(
    "postgres_changes",
    { event: "*", schema: "public", table: TABLE, filter: `id=eq.${code}` },
    (payload) => {
      if (payload.new && payload.new.state) {
        _state = payload.new.state;
        stateCbs.forEach((cb) => cb(_state));
      }
    }
  );

  channel.on("presence", { event: "sync" }, () => {
    const st = channel.presenceState();
    online = Object.keys(st);
    presCbs.forEach((cb) => cb(online));
  });

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

  const room = {
    code,
    isLocal: false,
    getState: () => _state,
    getOnline: () => online,
    onChange(cb) {
      stateCbs.add(cb);
      return () => stateCbs.delete(cb);
    },
    onPresence(cb) {
      presCbs.add(cb);
      cb(online);
      return () => presCbs.delete(cb);
    },
    async setState(next) {
      const value = typeof next === "function" ? next(_state) : next;
      if (value === _state) return value; // updater devolveu o mesmo objeto = sem mudança
      _state = value;
      stateCbs.forEach((cb) => cb(_state)); // atualização otimista local
      const { error } = await supabase
        .from(TABLE)
        .update({ state: value, updated_at: new Date().toISOString() })
        .eq("id", code);
      if (error) console.error("Erro ao salvar estado:", error.message);
      return value;
    },
    async updatePresence(meta) {
      if (channel) await channel.track(meta);
    },
    broadcast(event, data) {
      if (!channel) return;
      channel.send({ type: "broadcast", event: "fd", payload: { event, data, from: clientId() } });
    },
    onBroadcast(cb) {
      bcastCbs.add(cb);
      return () => bcastCbs.delete(cb);
    },
    async leave() {
      try {
        if (channel) {
          await channel.untrack();
          await supabase.removeChannel(channel);
        }
      } catch (_) {}
      stateCbs.clear();
      presCbs.clear();
      bcastCbs.clear();
    },
  };
  return room;
}

// ---------------- SALA LOCAL (mesma tela / abas no mesmo navegador) ----------------
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

  // Sincroniza entre abas do mesmo navegador (permite testar com 2 abas).
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue) {
      _state = JSON.parse(e.newValue);
      stateCbs.forEach((cb) => cb(_state));
    }
  });

  // Canal efêmero (comandos/snapshots ao vivo) entre abas.
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
    onChange(cb) {
      stateCbs.add(cb);
      return () => stateCbs.delete(cb);
    },
    onPresence(cb) {
      cb([]);
      return () => {};
    },
    async setState(next) {
      const value = typeof next === "function" ? next(_state) : next;
      if (value === _state) return value;
      _state = value;
      localStorage.setItem(KEY, JSON.stringify(value));
      stateCbs.forEach((cb) => cb(_state));
      return value;
    },
    async updatePresence() {},
    broadcast(event, data) {
      if (bc) bc.postMessage({ event, data, from: clientId() });
    },
    onBroadcast(cb) {
      bcastCbs.add(cb);
      return () => bcastCbs.delete(cb);
    },
    async leave() {
      stateCbs.clear();
      bcastCbs.clear();
      try { if (bc) bc.close(); } catch (_) {}
    },
  };
}
