// Identidade anônima e persistente do jogador (sem cadastro), guardada no aparelho.
const KEY = "futdraft_cid";

export function clientId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = "c_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Sessão salva para reentrar numa sala após recarregar a página.
const SKEY = "futdraft_session";
export function saveSession(s) {
  try {
    localStorage.setItem(SKEY, JSON.stringify(s));
  } catch (_) {}
}
export function loadSession() {
  try {
    const raw = localStorage.getItem(SKEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}
export function clearSession() {
  localStorage.removeItem(SKEY);
}
