import { createClient } from "@supabase/supabase-js";

// Projeto padrão do FutDraft (dados de seleções são leitura pública via RLS; a chave
// "anon" é feita para ficar no cliente). O .env sobrepõe se você quiser outro projeto.
const DEFAULT_URL = "https://mcufbuiholfbxqmvmfkv.supabase.co";
const DEFAULT_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jdWZidWlob2xmYnhxbXZtZmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMTI3MTMsImV4cCI6MjA5Nzg4ODcxM30.AQvAo5mCGI2rq_EDk62HUO7UlxbvtdJbfPNXv7ulWZE";

const env = (typeof import.meta !== "undefined" && import.meta.env) || {};
const url = env.VITE_SUPABASE_URL || DEFAULT_URL;
const key = env.VITE_SUPABASE_ANON_KEY || DEFAULT_ANON;

export const hasSupabase = Boolean(url && key);

export const supabase = hasSupabase
  ? createClient(url, key, {
      realtime: { params: { eventsPerSecond: 10 } },
      // Sessão persistida: o login (usuário+senha) precisa sobreviver a recarregar a
      // página e renovar o token sozinho. É a base de toda a migração para o Supabase.
      // detectSessionInUrl: processa os tokens que voltam no link de recuperação de senha
      // (dispara o evento PASSWORD_RECOVERY) — sem isso a redefinição por e-mail não abre.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
