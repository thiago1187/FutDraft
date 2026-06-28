import { useEffect, useRef, useState } from "react";
import { Avatar } from "./bits.jsx";

// Quanto tempo cada toast fica visível antes de sumir sozinho.
const TOAST_MS = 15_000;

// Toasts no canto superior direito (convites de sala/desafio e pedidos de amizade).
// `items` = [{ id, emoji, color, name, sub, acceptLabel?, declineLabel?, onAccept, onDecline }].
// Cada item novo aparece por ~15s e some sozinho — mas continua pendente no Perfil até
// ser respondido (o toast é só um atalho).
export default function InviteToasts({ items = [] }) {
  const [visible, setVisible] = useState([]); // ids atualmente exibidos
  const seen = useRef(new Set());             // ids que já viraram toast (não repete)
  const timers = useRef(new Map());           // id -> timeout do auto-dismiss

  useEffect(() => {
    const ids = new Set(items.map((i) => i.id));
    // itens novos → mostra por TOAST_MS
    for (const it of items) {
      if (seen.current.has(it.id)) continue;
      seen.current.add(it.id);
      setVisible((v) => (v.includes(it.id) ? v : [...v, it.id]));
      const t = setTimeout(() => {
        setVisible((v) => v.filter((x) => x !== it.id));
        timers.current.delete(it.id);
      }, TOAST_MS);
      timers.current.set(it.id, t);
    }
    // itens que saíram da lista (respondidos/expirados) → tira o toast
    setVisible((v) => v.filter((id) => ids.has(id)));
  }, [items]);

  // limpa todos os timers ao desmontar
  useEffect(() => () => { for (const t of timers.current.values()) clearTimeout(t); }, []);

  function dismiss(id) {
    setVisible((v) => v.filter((x) => x !== id));
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
  }

  const shown = items.filter((it) => visible.includes(it.id));
  if (!shown.length) return null;

  return (
    <div className="invite-toasts">
      {shown.map((it) => (
        <div className="invite-toast" key={it.id}>
          <Avatar emoji={it.emoji} color={it.color} size={38} />
          <div className="invite-toast-meta">
            <div className="invite-toast-name">{it.name}</div>
            <div className="invite-toast-sub">{it.sub}</div>
          </div>
          <div className="invite-toast-actions">
            <button className="invite-toast-yes" onClick={() => { dismiss(it.id); it.onAccept?.(); }}>
              {it.acceptLabel || "Aceitar"}
            </button>
            <button className="invite-toast-no" onClick={() => { dismiss(it.id); it.onDecline?.(); }}>
              {it.declineLabel || "Recusar"}
            </button>
          </div>
          <span className="invite-toast-bar" />
        </div>
      ))}
    </div>
  );
}
