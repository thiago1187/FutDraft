import { useEffect, useState } from "react";
import { listFriendships, sendFriendRequest, acceptFriend } from "../lib/social.js";
import { isUuid } from "../lib/history.js";

// Botão de amizade reutilizável (pós-jogo, etc.). Self-contained: descobre o estado
// atual entre mim e o alvo e mostra a ação certa. Só aparece para 2 humanos logados.
export default function AddFriendButton({ myId, targetId, targetName, className = "" }) {
  const enabled = isUuid(myId) && isUuid(targetId) && myId !== targetId;
  const [status, setStatus] = useState(null); // null=carregando; none|accepted|outgoing|incoming
  const [fid, setFid] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!enabled) return;
    try {
      const { friends, incoming, outgoing } = await listFriendships(myId);
      if (friends.some((f) => f.profile?.id === targetId)) return setStatus("accepted");
      const inc = incoming.find((f) => f.profile?.id === targetId);
      if (inc) { setFid(inc.friendshipId); return setStatus("incoming"); }
      if (outgoing.some((f) => f.profile?.id === targetId)) return setStatus("outgoing");
      setStatus("none");
    } catch (_) { setStatus("none"); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [myId, targetId]);

  if (!enabled || status === null) return null;
  const act = async (fn) => { setBusy(true); try { await fn(); } catch (_) {} await load(); setBusy(false); };

  if (status === "accepted") return <span className={"add-friend is-on " + className}>✓ amigos</span>;
  if (status === "outgoing") return <span className={"add-friend pend " + className}>pedido enviado</span>;
  if (status === "incoming") {
    return <button className={"add-friend " + className} disabled={busy} onClick={() => act(() => acceptFriend(fid))}>aceitar pedido de {targetName || "amigo"} ✓</button>;
  }
  return <button className={"add-friend " + className} disabled={busy} onClick={() => act(() => sendFriendRequest(myId, targetId))}>＋ adicionar {targetName || "amigo"}</button>;
}
