import { useState } from "react";
import { Logo } from "./bits.jsx";
import { signIn, signUp, validUsername } from "../lib/auth.js";

// Tela de entrada: login OU cadastro, só com USUÁRIO + SENHA (sem e-mail).
// Ao autenticar, o listener de sessão no App troca de tela sozinho.
export default function Auth({ onGuest, isLocal }) {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";
  const canSubmit =
    validUsername(username) && password.length >= 6 && (!isSignup || teamName.trim().length >= 2);

  async function submit() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError("");
    try {
      if (isSignup) {
        await signUp({
          username,
          password,
          displayName: username.trim(),
          teamName: teamName.trim(),
        });
      } else {
        await signIn({ username, password });
      }
      // sucesso → onAuthChange no App assume daqui
    } catch (e) {
      setError(e?.message || "Não foi possível entrar.");
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
          entre de qualquer aparelho com seu usuário e senha.
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

        <div className="auth-tabs">
          <button
            className={"auth-tab" + (!isSignup ? " is-active" : "")}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Entrar
          </button>
          <button
            className={"auth-tab" + (isSignup ? " is-active" : "")}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Criar conta
          </button>
        </div>

        <label className="auth-label">Usuário</label>
        <input
          className="home-name-input"
          value={username}
          maxLength={20}
          placeholder="ex.: thiago10"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          disabled={isLocal || busy}
        />

        <label className="auth-label">Senha</label>
        <input
          className="home-name-input"
          type="password"
          value={password}
          maxLength={64}
          placeholder="mínimo 6 caracteres"
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

        {error && <div className="form-error">{error}</div>}

        {onGuest && (
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
