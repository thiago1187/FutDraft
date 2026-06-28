// Convites e desafios entre amigos (tabela game_invites, protegida por RLS: só remetente
// e destinatário enxergam). kind 'invite' = "venha pra minha sala" (room_id setado);
// kind 'challenge' = "vamos jogar" (sem sala — ao aceitar, o desafiante cria a sala).
import { supabase, hasSupabase } from "./supabase.js";
import { listBlockedIds } from "./social.js";

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

const FROM_PROFILE = "id, username, display_name, team_name, emoji, color";

// Convites/desafios PENDENTES recebidos (to_id = eu), com o profile do remetente embutido.
// Expira no client os mais velhos que INVITE_TTL_MS (status='expired') e não os devolve.
export async function listIncomingInvites(myId) {
  if (!hasSupabase || !myId) return [];
  const { data, error } = await supabase
    .from("game_invites")
    .select(`id, from_id, to_id, room_id, kind, status, created_at,
             from:profiles!game_invites_from_id_fkey(${FROM_PROFILE})`)
    .eq("to_id", myId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const now = Date.now();
  const fresh = [], stale = [];
  for (const inv of data || []) {
    if (now - new Date(inv.created_at).getTime() > INVITE_TTL_MS) stale.push(inv.id);
    else fresh.push(inv);
  }
  if (stale.length) {
    await supabase.from("game_invites").update({ status: "expired" }).in("id", stale).then(() => {}, () => {});
  }
  // Bloco E — quem está bloqueado não chega como convite.
  const blocked = new Set(await listBlockedIds(myId).catch(() => []));
  return fresh.filter((inv) => !blocked.has(inv.from_id));
}

// Recusar um convite/desafio.
export async function declineInvite(id) {
  if (!hasSupabase) return;
  const { error } = await supabase.from("game_invites").update({ status: "declined" }).eq("id", id);
  if (error) throw error;
}

// Aceitar: marca 'accepted'. Para 'invite' a sala já existe (o app entra na room_id);
// para 'challenge' o desafiante (from_id) cria a sala e grava o código (setInviteRoom).
export async function acceptInvite(id) {
  if (!hasSupabase) return;
  const { error } = await supabase.from("game_invites").update({ status: "accepted" }).eq("id", id);
  if (error) throw error;
}

// DESAFIANTE: meus desafios já aceitos pelo outro lado mas ainda sem sala (a materializar).
// Só os RECENTES (< TTL): desafios velhos não devem re-disparar criação de sala num reload.
export async function listAcceptedChallengesToHost(myId) {
  if (!hasSupabase || !myId) return [];
  const since = new Date(Date.now() - INVITE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("game_invites")
    .select("id, to_id, room_id, kind, status, created_at")
    .eq("from_id", myId).eq("kind", "challenge").eq("status", "accepted").is("room_id", null)
    .gte("created_at", since);
  if (error) throw error;
  return data || [];
}

// DESAFIADO: desafios que EU aceitei e que já ganharam sala (room_id) — pronto pra entrar.
// Só os RECENTES (< TTL): sem isso, um desafio velho te auto-entrava na sala a cada reload
// (parecia "reconectar bugado", pulando pra uma sala antiga em vez da sua).
export async function listMyAcceptedChallengeRooms(myId) {
  if (!hasSupabase || !myId) return [];
  const since = new Date(Date.now() - INVITE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("game_invites")
    .select("id, from_id, room_id, kind, status, created_at")
    .eq("to_id", myId).eq("kind", "challenge").eq("status", "accepted").not("room_id", "is", null)
    .gte("created_at", since);
  if (error) throw error;
  return data || [];
}

// Consome um convite/desafio já materializado (deleta) — evita re-disparar entrada num reload.
export async function consumeInvite(id) {
  if (!hasSupabase || !id) return;
  await supabase.from("game_invites").delete().eq("id", id).then(() => {}, () => {});
}

// Grava o código da sala criada no desafio (o convite "vira o endereço").
export async function setInviteRoom(id, roomCode) {
  if (!hasSupabase) return;
  const { error } = await supabase.from("game_invites").update({ room_id: roomCode }).eq("id", id);
  if (error) throw error;
}

// Realtime: escuta game_invites que me envolvem (recebidos + enviados). Chama onChange a
// cada evento. Devolve unsubscribe. (Requer a tabela na publication supabase_realtime; com
// a publication desligada o canal não dispara, mas o app também faz polling de reforço.)
export function subscribeInvites(myId, onChange) {
  if (!hasSupabase || !myId) return () => {};
  const ch = supabase.channel("invites_" + myId);
  const opts = (col) => ({ event: "*", schema: "public", table: "game_invites", filter: `${col}=eq.${myId}` });
  ch.on("postgres_changes", opts("to_id"), () => onChange());
  ch.on("postgres_changes", opts("from_id"), () => onChange());
  ch.subscribe();
  return () => { try { supabase.removeChannel(ch); } catch (_) {} };
}
