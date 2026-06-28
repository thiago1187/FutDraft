// Sincronização de relógio espectador↔host no multiplayer.
//
// REGRA DE OURO: só o HOST avança o tempo da partida. O espectador NUNCA conta o tempo
// sozinho — ele renderiza o estado que o host transmite e, se ficar pra trás (snapshot
// perdido, aba dormiu / rAF estrangulado, reconexão), SALTA para o minuto mais avançado
// que o host já transmitiu por QUALQUER canal. Nunca ultrapassa o host e nunca anda pra trás.
//
// A verdade do host chega por DOIS canais (host = fonte única):
//   • snap      — broadcast de alta frequência (~200ms), p/ animação suave das POSIÇÕES.
//                 É fire-and-forget: pode cair / não chegar quando uma aba está em segundo
//                 plano. Não dá pra confiar nele sozinho para o relógio.
//   • hostState — estado serializado gravado em rooms.state (Postgres). Chega mais espaçado,
//                 mas é CONFIÁVEL e re-sincroniza no reconnect (o cliente relê a linha).
//
// O espectador mostra as POSIÇÕES do snap (animação) e o RELÓGIO/placar/fase/fim do canal
// MAIS ADIANTADO. Como o minuto do host é monotônico, o resultado nunca regride.

// "Quão adiantado" está um estado: fim de jogo (over/FIM) conta como além de qualquer minuto
// — assim o apito final chega pelo canal confiável mesmo empatado no minuto 90.
function advance(st) {
  if (!st) return -2;
  const m = typeof st.minute === "number" ? st.minute : -1;
  return (st.over || st.phase === "FIM") ? m + 1e6 : m;
}

// snap = compact() do broadcast; hostState = estado serializado confiável (restore.state).
// Devolve o "view" que o espectador deve renderizar.
export function reconcileSpectatorView(snap, hostState) {
  if (!snap) return hostState || null;                 // sem broadcast ainda → estado confiável
  if (!hostState) return snap;                          // sem persistência ainda → só o broadcast
  if (advance(hostState) <= advance(snap)) return snap; // broadcast em dia (caso normal)
  // Broadcast atrasou/caiu: SALTA relógio/placar/fase/fim/lance para o estado confiável do
  // host, mantendo as últimas POSIÇÕES do snap p/ a tela não congelar/zerar.
  return {
    ...snap,
    minute: hostState.minute,
    score: hostState.score,
    phase: hostState.phase,
    over: hostState.over,
    penaltyPending: hostState.penaltyPending ?? snap.penaltyPending,
    cinematic: hostState.cinematic ?? snap.cinematic,
    lastEvent: hostState.lastEvent ?? snap.lastEvent,
    stats: hostState.stats ?? snap.stats,
  };
}
