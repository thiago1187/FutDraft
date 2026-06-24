import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Se as chaves não estiverem configuradas, o app entra em "modo local" (mesma tela).
export const hasSupabase = Boolean(url && key);

export const supabase = hasSupabase
  ? createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: false },
    })
  : null;
