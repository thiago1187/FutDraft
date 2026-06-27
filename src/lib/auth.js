// Autenticação por E-MAIL real + SENHA.
// O username (identidade pública, índice único em profiles) é DERIVADO do e-mail;
// o trigger `on_auth_user_created` cria o profile e garante unicidade do username.
// E-mail real habilita recuperação de senha por link (resetPasswordForEmail).
import { supabase, hasSupabase } from "./supabase.js";

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function validEmail(email) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

// Username público derivado da parte local do e-mail (só p/ semear o profile;
// o trigger garante unicidade — se colidir, vira `user_<id>`).
export function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, "");
}

function usernameFromEmail(email) {
  const local = normalizeEmail(email).split("@")[0] || "";
  return normalizeUsername(local).slice(0, 20);
}

// Cadastro: cria o usuário no Auth com e-mail real + metadados; o trigger no banco cria
// a linha em profiles (username derivado/único). Depois grava os extras (time/escudo/cor).
export async function signUp({ email, password, displayName, teamName, emoji, color }) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  const mail = normalizeEmail(email);
  if (!validEmail(mail)) throw new Error("Informe um e-mail válido.");
  if (!password || password.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");
  const uname = usernameFromEmail(mail);

  const { data, error } = await supabase.auth.signUp({
    email: mail,
    password,
    options: { data: { username: uname, display_name: displayName || uname } },
  });
  if (error) {
    if (isTakenError(error)) throw new Error("Esse e-mail já tem conta. Faça login ou recupere a senha.");
    throw new Error(humanize(error));
  }

  // Contas são auto-confirmadas no banco (trigger), então normalmente já vem sessão.
  // Se não vier (ex.: confirmação ligada), tenta logar na hora.
  if (!data.session) {
    await signIn({ email: mail, password });
  }

  // Completa o profile com os campos que o trigger não setou (time/escudo/cor).
  await updateMyProfile({ team_name: teamName, emoji, color }).catch(() => {});
  return data.user;
}

// Login com e-mail + senha.
export async function signIn({ email, password }) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("invalid")) {
      throw new Error("E-mail ou senha incorretos.");
    }
    throw new Error(humanize(error));
  }
  return data.user;
}

// Recuperação de senha: envia um link via Edge Function `send-recovery` (Resend), que
// contorna o limite de envio do servidor de e-mail padrão do Supabase. Ao clicar no
// link, o usuário volta com sessão de recuperação (evento PASSWORD_RECOVERY) e define
// a nova senha. Resposta neutra: não revela se o e-mail tem conta.
export async function requestPasswordReset(email) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  const mail = normalizeEmail(email);
  if (!validEmail(mail)) throw new Error("Informe um e-mail válido para recuperar a senha.");
  const { data, error } = await supabase.functions.invoke("send-recovery", {
    body: { email: mail, redirectTo: window.location.origin },
  });
  if (error) throw new Error("Não foi possível enviar o link agora. Tente novamente em instantes.");
  if (data?.error === "missing_resend_key") {
    throw new Error("Envio de e-mail ainda não configurado (falta o secret RESEND_API_KEY no Supabase).");
  }
  if (data?.error) throw new Error("Não foi possível enviar o link. Tente novamente em instantes.");
}

// Define uma nova senha (usado na tela que aparece após o link de recuperação).
export async function updatePassword(newPassword) {
  if (!hasSupabase) throw new Error("Supabase não configurado");
  if (!newPassword || newPassword.length < 6) throw new Error("A senha precisa de pelo menos 6 caracteres.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(humanize(error));
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

// Inscreve em mudanças de sessão (login/logout/refresh/recuperação). Retorna unsubscribe.
// cb(session, event) — event === "PASSWORD_RECOVERY" quando o usuário volta do link.
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => cb(session, event));
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
  const low = m.toLowerCase();
  if (low.includes("email") && low.includes("rate")) {
    return "Limite de envio de e-mail atingido (servidor de e-mail do Supabase). Aguarde alguns minutos — ou configure um SMTP próprio para enviar sem limite.";
  }
  if (low.includes("rate limit")) return "Muitas tentativas. Aguarde cerca de 1 minuto e tente de novo.";
  return m;
}
