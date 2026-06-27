// Persistência de partidas/torneios no Supabase (alimenta profile_stats e head_to_head).
// Só o ANFITRIÃO autenticado grava; bots/locais entram com user_id nulo.
import { supabase, hasSupabase } from "./supabase.js";

export function isUuid(id) {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Garante rooms.host_id = uuid do anfitrião — as policies de matches/tournaments usam
// isso para autorizar a gravação de partidas entre bots (em que não sou home nem away).
export async function ensureRoomHost(roomId, hostId) {
  if (!hasSupabase || !roomId || !isUuid(hostId)) return;
  try {
    await supabase.from("rooms").update({ host_id: hostId, code: roomId }).eq("id", roomId);
  } catch (_) { /* não quebra o jogo */ }
}

// Cria (uma vez por token de torneio) a linha em tournaments e devolve o id.
const tourCache = new Map(); // token -> Promise<uuid|null>
function ensureTournament(token, { roomId, name, format }) {
  if (!hasSupabase || !token) return Promise.resolve(null);
  if (!tourCache.has(token)) {
    tourCache.set(
      token,
      (async () => {
        const { data, error } = await supabase
          .from("tournaments")
          .insert({ room_id: roomId || null, name: name || null, format: format || null })
          .select("id")
          .maybeSingle();
        if (error) { console.warn("tournament insert:", error.message); return null; }
        return data?.id || null;
      })()
    );
  }
  return tourCache.get(token);
}

// Grava uma partida concluída + seus gols. home/away = { userId|null, squad|null }.
export async function recordMatch({ token, roomId, name, format, round, home, away, result }) {
  if (!hasSupabase || !result) return;
  try {
    const tournamentId = await ensureTournament(token, { roomId, name, format });
    const winSide = result.winner;
    const winnerUserId = winSide === "home" ? home.userId : winSide === "away" ? away.userId : null;

    const { data: mrow, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        room_id: roomId || null,
        round: round != null ? String(round) : null,
        home_user_id: home.userId || null,
        away_user_id: away.userId || null,
        home_squad: home.squad || null,
        away_squad: away.squad || null,
        home_score: result.homeGoals ?? null,
        away_score: result.awayGoals ?? null,
        home_pens: result.pens?.home ?? null,
        away_pens: result.pens?.away ?? null,
        xg_home: result.xg?.[0] ?? null,
        xg_away: result.xg?.[1] ?? null,
        winner_user_id: winnerUserId,
        summary: result.summary || null,
      })
      .select("id")
      .maybeSingle();
    if (error) { console.warn("match insert:", error.message); return; }

    const matchId = mrow?.id;
    const goals = (result.events || []).filter((e) => e.type === "goal");
    if (matchId && goals.length) {
      const rows = goals.map((e) => ({
        match_id: matchId,
        minute: e.minute ?? null,
        type: "goal",
        team: e.side || null,
        user_id: (e.side === "home" ? home.userId : away.userId) || null,
        player_name: e.scorer || null,
        detail: e.score ? { score: e.score } : null,
      }));
      await supabase.from("match_events").insert(rows);
    }
  } catch (_) { /* histórico é best-effort; nunca quebra a partida */ }
}

// ---- Draft relacional (espelho durável; o sorteio em curso segue no rooms.state) ----
const draftCache = new Map(); // token -> Promise<draftId|null>
function ensureDraft(token, roomId) {
  if (!hasSupabase || !token) return Promise.resolve(null);
  if (!draftCache.has(token)) {
    draftCache.set(
      token,
      (async () => {
        const { data, error } = await supabase
          .from("drafts")
          .insert({ room_id: roomId || null, status: "active" })
          .select("id")
          .maybeSingle();
        if (error) { console.warn("draft insert:", error.message); return null; }
        return data?.id || null;
      })()
    );
  }
  return draftCache.get(token);
}

// Grava um pick finalizado em draft_picks (só o anfitrião chama; RLS host-of-room autoriza).
export async function recordDraftPick({ token, roomId, slot, userId, squadSlug, playerId, playerName, position, pickOrder }) {
  if (!hasSupabase || !token) return;
  try {
    const draftId = await ensureDraft(token, roomId);
    if (!draftId) return;
    await supabase.from("draft_picks").insert({
      draft_id: draftId,
      room_id: roomId || null,
      slot: slot ?? null,
      user_id: userId && isUuid(userId) ? userId : null,
      squad_slug: squadSlug || null,
      player_id: playerId || null,
      player_name: playerName || null,
      position: position || null,
      pick_order: pickOrder ?? null,
    });
  } catch (_) { /* best-effort */ }
}

// Marca o campeão do torneio (atualiza a linha já criada por recordMatch).
export async function setChampion({ token, championUserId, championSquad }) {
  if (!hasSupabase || !token) return;
  try {
    const id = await tourCache.get(token);
    if (!id) return;
    await supabase
      .from("tournaments")
      .update({
        champion_user_id: championUserId || null,
        champion_squad: championSquad || null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", id);
  } catch (_) { /* idem */ }
}
