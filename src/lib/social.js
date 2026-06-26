// Camada de dados social: estatísticas (view profile_stats), amigos (friendships) e
// confronto direto (RPC head_to_head). Tudo no Supabase, protegido por RLS.
import { supabase, hasSupabase } from "./supabase.js";

const PROFILE_COLS = "id, username, display_name, team_name, emoji, color";

// Estatísticas do jogador (jogos, V/E/D, gols, títulos). A view sempre devolve uma
// linha por profile (LEFT JOIN), então zera sozinha para quem nunca jogou.
export async function getStats(userId) {
  if (!hasSupabase || !userId) return null;
  const { data, error } = await supabase
    .from("profile_stats")
    .select("user_id, username, matches_played, wins, draws, losses, goals_for, goals_against, titles")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Busca jogadores por usuário (prefixo), exceto eu.
export async function searchProfiles(query, excludeId) {
  if (!hasSupabase) return [];
  const q = String(query || "").trim().toLowerCase();
  if (q.length < 2) return [];
  let req = supabase.from("profiles").select(PROFILE_COLS).ilike("username", `${q}%`).limit(12);
  if (excludeId) req = req.neq("id", excludeId);
  const { data, error } = await req;
  if (error) throw error;
  return data || [];
}

// Lista os vínculos do usuário, já com o profile do "outro lado" embutido.
// Categoriza em: amigos (accepted), pedidos recebidos e pedidos enviados (pending).
export async function listFriendships(myId) {
  if (!hasSupabase || !myId) return { friends: [], incoming: [], outgoing: [] };
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS}),
       addressee:profiles!friendships_addressee_id_fkey(${PROFILE_COLS})`
    )
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);
  if (error) throw error;
  const friends = [], incoming = [], outgoing = [];
  for (const f of data || []) {
    const iAmRequester = f.requester_id === myId;
    const other = iAmRequester ? f.addressee : f.requester;
    const row = { friendshipId: f.id, status: f.status, profile: other };
    if (f.status === "accepted") friends.push(row);
    else if (f.status === "pending") (iAmRequester ? outgoing : incoming).push(row);
  }
  return { friends, incoming, outgoing };
}

// Envia pedido de amizade (RLS exige requester_id = auth.uid()).
export async function sendFriendRequest(myId, addresseeId) {
  if (!hasSupabase) return;
  if (myId === addresseeId) throw new Error("Não dá para adicionar você mesmo.");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: myId, addressee_id: addresseeId, status: "pending" });
  if (error) {
    if (String(error.message || "").toLowerCase().includes("duplicate")) {
      throw new Error("Vocês já têm um pedido ou amizade.");
    }
    throw error;
  }
}

export async function acceptFriend(friendshipId) {
  if (!hasSupabase) return;
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId);
  if (error) throw error;
}

// Remove vínculo (recusar pedido, cancelar envio ou desfazer amizade).
export async function removeFriendship(friendshipId) {
  if (!hasSupabase) return;
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

// Confronto direto entre dois usuários (vitórias de cada, gols).
export async function headToHead(userA, userB) {
  if (!hasSupabase) return null;
  const { data, error } = await supabase.rpc("head_to_head", { user_a: userA, user_b: userB });
  if (error) throw error;
  // A função RETURNS TABLE → vem como array de uma linha.
  return Array.isArray(data) ? data[0] : data;
}
