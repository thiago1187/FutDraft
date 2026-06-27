// Convites e desafios entre amigos (tabela game_invites, protegida por RLS: só remetente
// e destinatário enxergam). kind 'invite' = "venha pra minha sala" (room_id setado);
// kind 'challenge' = "vamos jogar" (sem sala — ao aceitar, o desafiante cria a sala).
import { supabase, hasSupabase } from "./supabase.js";

// Convites pendentes mais velhos que isto são tratados como expirados ao listar.
export const INVITE_TTL_MS = 10 * 60_000;

// Cria um convite/desafio. Substitui qualquer convite pendente MEU para o mesmo amigo
// (evita acúmulo de duplicados ao clicar várias vezes). RLS exige from_id = auth.uid().
export async function createInvite({ fromId, toId, kind, roomId = null }) {
  if (!hasSupabase) return;
  if (!fromId || !toId || fromId === toId) throw new Error("Convite inválido.");
  await supabase
    .from("game_invites")
    .delete()
    .eq("from_id", fromId)
    .eq("to_id", toId)
    .eq("status", "pending");
  const { error } = await supabase
    .from("game_invites")
    .insert({ from_id: fromId, to_id: toId, kind, room_id: roomId, status: "pending" });
  if (error) throw error;
}
