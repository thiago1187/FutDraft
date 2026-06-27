import { useState } from "react";
import { Logo } from "./bits.jsx";
import { signIn, signUp, validIdentifier, validEmail, requestPasswordReset } from "../lib/auth.js";

// Tela de entrada: login, cadastro OU recuperação de senha.
// Cadastro/login aceitam E-MAIL real OU nome de usuário no mesmo campo (detecta pelo "@").
// E-mail real habilita recuperação de senha; só-usuário não tem caixa de entrada.
export default function Auth({ onGuest, isLocal }) {
  const [mode, setMode] = useState("login"); // "login" | "signup" | "forgot"
  const [identifier, setIdentifier] = useState(""); // e-mail OU usuário
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); // mensagens neutras (ex.: link de senha enviado)

  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";

  function go(next) {
    setMode(next);
    setError("");
    setNotice("");
  }

  const canSubmit =
    validIdentifier(identifier) && password.length >= 6 && (!isSignup || teamName.trim().length >= 2);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (isSignup) {
        await signUp({
          identifier,
          password,
          displayName: teamName.trim() || undefined,
          teamName: teamName.trim(),
        });
      } else {
        await signIn({ identifier, password });
      }
      // sucesso → onAuthChange no App assume daqui
    } catch (e) {
      setError(e?.message || "Não foi possível entrar.");
      setBusy(false);
    }
  }

  async function sendReset() {
    if (busy) return;
    setError("");
    setNotice("");
    if (!validEmail(identifier)) {
      setError("A recuperação só funciona com e-mail. Digite o e-mail da sua conta.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(identifier);
      setNotice("Pronto! Se houver conta com esse e-mail, enviamos um link para redefinir a senha. Verifique a caixa de entrada (e o spam).");
    } catch (e) {
      setError(e?.message || "Não foi possível enviar o link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="split home-split auth-split">
      {/* ESQUERDA — apresentação */}
      <div className="split-left home-left">
        <div className="home-topbar">
          <span className="home-kicker">FutDraft ⚽ · Copa entre amigos</span>
          <span className="home-badge">Sua conta · estatísticas</span>
        </div>

        <Logo size="lg" />

        <p className="home-lede">
          Crie sua conta para ter <strong>perfil</strong>, <strong>amigos</strong>,
          <strong> histórico</strong> e <strong>confronto direto</strong>. Tudo salvo na nuvem —
          entre de qualquer aparelho com seu login e senha.
        </p>

        <div className="auth-perks">
          <div className="auth-perk"><span>🏆</span> Títulos e aproveitamento</div>
          <div className="auth-perk"><span>📊</span> Vitórias, gols e retrospecto</div>
          <div className="auth-perk"><span>🤝</span> Amigos e desafios diretos</div>
        </div>
      </div>

      {/* DIREITA — formulário */}
      <div className="split-right home-right">
        {isLocal && (
          <div className="banner banner-local">
            <strong>Modo local.</strong> Sem Supabase configurado não dá para criar conta — jogue offline.
          </div>
        )}

        {isForgot ? (
          /* ----- Recuperação de senha ----- */
          <>
            <div className="auth-tabs">
              <button className="auth-tab is-active">Recuperar senha</button>
            </div>

            <p className="auth-hint">
              Digite o <strong>e-mail</strong> da sua conta. Enviaremos um link para você
              definir uma nova senha. (Contas só com nome de usuário não têm recuperação por e-mail.)
            </p>

            <label className="auth-label">E-mail da conta</label>
            <input
              className="home-name-input"
              type="email"
              value={identifier}
              placeholder="ex.: voce@email.com"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              spellCheck={false}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendReset()}
              disabled={isLocal || busy}
            />

            <button
              className="btn btn-primary btn-block btn-xl auth-submit"
              onClick={sendReset}
              disabled={!validEmail(identifier) || busy || isLocal}
            >
              {busy ? "Enviando…" : "Enviar link de recuperação"} <span className="arr">→</span>
            </button>

            {error && <div className="form-error">{error}</div>}
            {notice && <div className="form-notice">{notice}</div>}

            <button className="auth-link" onClick={() => go("login")} disabled={busy}>
              ← Voltar para o login
            </button>
          </>
        ) : (
          /* ----- Login / Cadastro ----- */
          <>
            <div className="auth-tabs">
              <button
                className={"auth-tab" + (!isSignup ? " is-active" : "")}
                onClick={() => go("login")}
              >
                Entrar
              </button>
              <button
                className={"auth-tab" + (isSignup ? " is-active" : "")}
                onClick={() => go("signup")}
              >
                Criar conta
              </button>
            </div>

            <label className="auth-label">E-mail ou nome de usuário</label>
            <input
              className="home-name-input"
              type="text"
              value={identifier}
              placeholder="seu@email.com ou um apelido"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              spellCheck={false}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={isLocal || busy}
            />
            {isSignup && (
              <p className="auth-hint">
                Com <strong>e-mail</strong> você pode recuperar a senha depois. Só com
                <strong> nome de usuário</strong> dá pra jogar igual, mas sem recuperação por e-mail.
              </p>
            )}

            <label className="auth-label">Senha</label>
            <input
              className="home-name-input"
              type="password"
              value={password}
              maxLength={64}
              placeholder="mínimo 6 caracteres"
              autoComplete={isSignup ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              disabled={isLocal || busy}
            />

            {isSignup && (
              <>
                <label className="auth-label">Nome do seu time</label>
                <input
                  className="home-name-input"
                  value={teamName}
                  maxLength={22}
                  placeholder="ex.: Leões FC"
                  onChange={(e) => setTeamName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  disabled={isLocal || busy}
                />
              </>
            )}

            <button
              className="btn btn-primary btn-block btn-xl auth-submit"
              onClick={submit}
              disabled={!canSubmit || busy || isLocal}
            >
              {busy ? "Aguarde…" : isSignup ? "Criar conta" : "Entrar"} <span className="arr">→</span>
            </button>

            {!isSignup && !isLocal && (
              <button className="auth-link" onClick={() => go("forgot")} disabled={busy}>
                Esqueci minha senha
              </button>
            )}

            {error && <div className="form-error">{error}</div>}
            {notice && <div className="form-notice">{notice}</div>}
          </>
        )}

        {onGuest && !isForgot && (
          <>
            <div className="home-or"><span /> ou <span /></div>
            <button className="btn btn-ghost btn-block" onClick={onGuest} disabled={busy}>
              Jogar offline (sem conta)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
