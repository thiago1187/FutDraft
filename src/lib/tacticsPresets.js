// Presets de tática salvos pelo jogador (tabela Supabase `saved_tactics`, RLS por dono).
// Guardamos só as alavancas de TIME (postura, linha, posse, pressão, foco de ataque) — a
// marcação individual (manMark) é escolha por ADVERSÁRIO, então não cabe num preset reusável.
import { supabase, hasSupabase } from "./supabase.js";

const COLS = "id, name, tactics, is_default, created_at";
const LEVERS = ["posture", "line", "build", "marking", "attackSide"];

// só as chaves de time, normalizadas — nunca grava manMark nem lixo no jsonb.
export function cleanTactics(t = {}) {
  const out = {};
  for (const k of LEVERS) if (t[k] != null) out[k] = t[k];
  return out;
}

async function uid() {
  if (!hasSupabase) return null;
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

// Lista os presets do usuário logado (padrão primeiro). Sem login → [].
export async function listMyPresets() {
  const id = await uid();
  if (!id) return [];
  const { data, error } = await supabase
    .from("saved_tactics")
    .select(COLS)
    .eq("user_id", id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createPreset(name, tactics) {
  const id = await uid();
  if (!id) throw new Error("Faça login para salvar presets.");
  const { data, error } = await supabase
    .from("saved_tactics")
    .insert({ user_id: id, name: (name || "").trim().slice(0, 40) || "Sem nome", tactics: cleanTactics(tactics) })
    .select(COLS)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updatePreset(presetId, patch) {
  const p = { ...patch, updated_at: new Date().toISOString() };
  if (p.tactics) p.tactics = cleanTactics(p.tactics);
  if (p.name != null) p.name = String(p.name).trim().slice(0, 40) || "Sem nome";
  const { data, error } = await supabase.from("saved_tactics").update(p).eq("id", presetId).select(COLS).maybeSingle();
  if (error) throw error;
  return data;
}

export async function deletePreset(presetId) {
  const { error } = await supabase.from("saved_tactics").delete().eq("id", presetId);
  if (error) throw error;
}

// Um único padrão por usuário: zera os outros e marca este (RLS limita às minhas linhas).
export async function setDefaultPreset(presetId) {
  const id = await uid();
  if (!id) return;
  const { error: e1 } = await supabase.from("saved_tactics").update({ is_default: false }).eq("user_id", id).neq("id", presetId);
  if (e1) throw e1;
  const { error: e2 } = await supabase.from("saved_tactics").update({ is_default: true }).eq("id", presetId);
  if (e2) throw e2;
}
