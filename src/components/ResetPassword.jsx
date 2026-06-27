import { useState } from "react";
import { Logo } from "./bits.jsx";
import { updatePassword } from "../lib/auth.js";

// Tela mostrada quando o usuário volta do link de recuperação (evento PASSWORD_RECOVERY).
// Ele já tem uma sessão de recuperação; aqui só define a nova senha.
export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  const canSubmit = password.length >= 6 && password === confirm;

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      await updatePassword(password);
      setOk(true);
    } catch (e) {
      setError(e?.message || "Não foi possível alterar a senha.");
      setBusy(false);
    }
  }

  return (
    <div className="split home-split auth-split">
      <div className="split-left home-left">
        <div className="home-topbar">
          <span className="home-kicker">FutDraft ⚽ · Recuperação de senha</span>
        </div>
        <Logo size="lg" />
        <p className="home-lede">Defina uma <strong>nova senha</strong> para sua conta. Depois é só entrar normalmente.</p>
      </div>

      <div className="split-right home-right">
        {ok ? (
          <>
            <div className="form-notice">Senha alterada com sucesso! Já pode usar a nova senha.</div>
            <button className="btn btn-primary btn-block btn-xl auth-submit" onClick={onDone}>
              Continuar <span className="arr">→</span>
            </button>
          </>
        ) : (
          <>
            <div className="auth-tabs">
              <button className="auth-tab is-active">Nova senha</button>
            </div>

            <label className="auth-label">Nova senha</label>
            <input
              className="home-name-input"
              type="password"
              value={password}
              maxLength={64}
              placeholder="mínimo 6 caracteres"
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={busy}
            />

            <label className="auth-label">Confirmar senha</label>
            <input
              className="home-name-input"
              type="password"
              value={confirm}
              maxLength={64}
              placeholder="repita a senha"
              autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={busy}
            />

            <button
              className="btn btn-primary btn-block btn-xl auth-submit"
              onClick={submit}
              disabled={!canSubmit || busy}
            >
              {busy ? "Aguarde…" : "Salvar nova senha"} <span className="arr">→</span>
            </button>

            {confirm.length > 0 && password !== confirm && (
              <div className="form-error">As senhas não conferem.</div>
            )}
            {error && <div className="form-error">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
