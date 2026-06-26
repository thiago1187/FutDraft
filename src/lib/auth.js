// Autenticação por USUÁRIO + SENHA (sem e-mail real).
// O Supabase Auth exige um e-mail, então usamos um e-mail sintético determinístico
// `${username}@futdraft.app`. O username é a identidade pública (índice único em profiles);
// o trigger `on_auth_user_created` cria o profile lendo raw_user_meta_data.username.
import { supabase, hasSupabase } from "./supabase.js";

const EMAIL_DOMAIN = "futdraft.app";

// username -> e-mail sintético. Normaliza para minúsculas e caracteres seguros.
function emailFor(username) {
  return `${normalizeUsername(username)}@${EMAIL_DOMAIN}`;
}

export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
}

export function validUsername(username) {
  const u = normalizeUsername(username);
  return u.length >= 3 && u.length <= 20;
}

// Cadastro: cria o usuário no Auth com metadados (username/display_name/team_name…); o
// trigger no banco cria a linha em profiles. Depois grava os extras (escudo/cor/time)
// que o trigger não preenche. Username duplicado -> erro tratável.
export async function signUp({ username, password, displayName, teamName, emoji, color }) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  const uname = normalizeUsername(username);
  if (!validUsername(uname)) throw new Error("Usuário deve ter 3 a 20 caracteres (a-z, 0-9, . _ -).");
  if (!password || password.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");

  const { data, error } = await supabase.auth.signUp({
    email: emailFor(uname),
    password,
    options: { data: { username: uname, display_name: displayName || uname } },
  });
  if (error) {
    if (isTakenError(error)) throw new Error("Esse usuário já existe. Escolha outro.");
    throw new Error(humanize(error));
  }

  // Contas @futdraft.app são auto-confirmadas no banco (trigger), então normalmente já
  // vem sessão. Se não vier (ex.: confirmação ligada), tenta logar na hora.
  if (!data.session) {
    await signIn({ username: uname, password });
  }

  // Completa o profile com os campos que o trigger não setou (time/escudo/cor).
  await updateMyProfile({ team_name: teamName, emoji, color }).catch(() => {});
  return data.user;
}

// Login com usuário + senha.
export async function signIn({ username, password }) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailFor(username),
    password,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("invalid")) {
      throw new Error("Usuário ou senha incorretos.");
    }
    throw new Error(humanize(error));
  }
  return data.user;
}

export async function signOut() {
  if (!hasSupabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

// Inscreve em mudanças de sessão (login/logout/refresh). Retorna unsubscribe.
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

// Lê o profile do usuário logado (ou de um id qualquer — leitura é pública).
export async function getProfile(userId) {
  if (!hasSupabase || !userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, team_name, emoji, color")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Atualiza o meu profile (RLS garante que só o dono escreve).
export async function updateMyProfile(patch) {
  if (!hasSupabase) return null;
  const { data: u } = await supabase.auth.getUser();
  const id = u?.user?.id;
  if (!id) throw new Error("Sem sessão.");
  const clean = {};
  for (const k of ["display_name", "team_name", "emoji", "color"]) {
    if (patch[k] != null) clean[k] = patch[k];
  }
  if (!Object.keys(clean).length) return null;
  const { data, error } = await supabase.from("profiles").update(clean).eq("id", id).select().maybeSingle();
  if (error) throw error;
  return data;
}

function isTakenError(error) {
  const m = String(error?.message || "").toLowerCase();
  return m.includes("already registered") || m.includes("already exists") || m.includes("duplicate") || error?.code === "user_already_exists";
}

function humanize(error) {
  const m = String(error?.message || "erro de autenticação");
  if (m.toLowerCase().includes("rate limit")) return "Muitas tentativas. Aguarde um instante.";
  return m;
}
