// Presets de tática do usuário (tabela saved_tactics, RLS: só o dono). Guarda as alavancas
// de tática que GENERALIZAM entre partidas — postura, linha, posse (build), pressão
// (marking) e foco de ataque. A marcação individual (manMark) é por-adversário e definida
// ao vivo, então fica fora do preset. Um preset pode ser o padrão (is_default — índice
// parcial único garante 1 só por usuário).
import { supabase, hasSupabase } from "./supabase.js";

export const TACTIC_LEVERS = ["posture", "line", "build", "marking", "attackSide"];
export const DEFAULT_TACTIC = { posture: "equilibrado", line: "media", build: 0.5, marking: "leve", attackSide: "meio" };

// Mantém só as alavancas conhecidas (descarta lixo/manMark).
export function pickLevers(t = {}) {
  const out = {};
  for (const k of TACTIC_LEVERS) if (t[k] !== undefined && t[k] !== null) out[k] = t[k];
  return out;
}

// Lista meus presets (padrão primeiro). RLS já filtra por dono — não precisa de user_id.
export async function listMyTactics() {
  if (!hasSupabase) return [];
  const { data, error } = await supabase
    .from("saved_tactics")
    .select("id, name, tactics, is_default, updated_at")
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Limpa o default atual (menos o id informado) — garante a unicidade do índice parcial.
async function clearDefault(userId, exceptId) {
  let req = supabase.from("saved_tactics").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (exceptId) req = req.neq("id", exceptId);
  await req;
}

// Cria (sem id) ou edita (com id) um preset. Se isDefault, zera o default anterior antes.
export async function saveTactic({ id, userId, name, tactics, isDefault }) {
  if (!hasSupabase || !userId) return null;
  if (isDefault) await clearDefault(userId, id);
  const row = { user_id: userId, name: (name || "").trim() || "Preset", tactics: pickLevers(tactics), is_default: !!isDefault };
  const res = id
    ? await supabase.from("saved_tactics").update({ ...row, updated_at: new Date().toISOString() }).eq("id", id).select().maybeSingle()
    : await supabase.from("saved_tactics").insert(row).select().maybeSingle();
  if (res.error) throw res.error;
  return res.data;
}

// Marca um preset como padrão (e zera o anterior).
export async function setDefaultTactic(userId, id) {
  if (!hasSupabase || !userId || !id) return;
  await clearDefault(userId, id);
  const { error } = await supabase.from("saved_tactics").update({ is_default: true, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}

export async function deleteTactic(id) {
  if (!hasSupabase || !id) return;
  const { error } = await supabase.from("saved_tactics").delete().eq("id", id);
  if (error) throw error;
}
