import { useEffect, useRef, useState } from "react";
import { Logo } from "./bits.jsx";

const STEPS = [
  { n: "01", t: "Entre na sala", d: "Só o nome de técnico e o código" },
  { n: "02", t: "Drafte o time", d: "Role o dado e escolha craques das Copas" },
  { n: "03", t: "Simule a copa", d: "Partidas 2D, pênaltis e troféu" },
];

export default function Home({ onCreate, onJoin, onRejoin, session, connecting, error, isLocal, account, onSignOut, onOpenProfile, incomingRequests = 0 }) {
  const [name, setName] = useState(account?.team_name || session?.name || "");
  const [code, setCode] = useState("");

  // Preenche o campo com o nome do time assim que o perfil carrega — mas só até você
  // digitar algo. A partir daí o que você escrever manda, sem voltar pro valor fixo.
  const nameTouched = useRef(false);
  useEffect(() => {
    if (!nameTouched.current && account?.team_name) setName(account.team_name);
  }, [account?.team_name]);

  const canCreate = name.trim().length >= 2;
  const canJoin = name.trim().length >= 2 && code.trim().length >= 3;

  function submitCreate() {
    if (canCreate && !connecting) onCreate(name.trim());
  }
  function submitJoin() {
    if (canJoin && !connecting) onJoin(code.trim().toUpperCase(), name.trim());
  }

  return (
    <div className="split home-split">
      {/* ESQUERDA — apresentação */}
      <div className="split-left home-left">
        <div className="home-topbar">
          <span className="home-kicker">FutDraft <span className="home-kicker-ball" aria-hidden>⚽</span> · Copa entre amigos</span>
          {account ? (
            <span className="home-badge home-badge--account">
              <span className="home-badge-ava">{(account.username || "?").charAt(0).toUpperCase()}</span>
              @{account.username}
            </span>
          ) : (
            <span className="home-badge">{isLocal ? "Modo local" : "Convidado"}</span>
          )}
        </div>

        <Logo size="lg" />

        <p className="home-lede">
          Crie uma sala, compartilhe o código e montem os times num <strong>draft</strong> de
          craques de várias Copas. Depois é só assistir — e comandar — a <strong>simulação 2D ao vivo</strong>.
        </p>

        <div className="home-steps">
          {STEPS.map((s) => (
            <div className="home-step" key={s.n}>
              <div className="home-step-n">{s.n}</div>
              <div className="home-step-t">{s.t}</div>
              <div className="home-step-d">{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DIREITA — ações */}
      <div className="split-right home-right">
        {account && (
          <div className="home-account">
            <div className="home-account-id">
              <span className="home-account-label">Logado como</span>
              <span className="home-account-user">@{account.username}</span>
            </div>
            <div className="home-account-actions">
              {onOpenProfile && (
                <button className="home-account-profile" onClick={onOpenProfile}>
                  Meu perfil
                  {incomingRequests > 0 && <span className="home-req-badge" title={`${incomingRequests} pedido(s) de amizade`}>{incomingRequests}</span>}
                </button>
              )}
              {onSignOut && (
                <button className="home-account-out" onClick={onSignOut}>Sair</button>
              )}
            </div>
          </div>
        )}

        {isLocal && (
          <div className="banner banner-local">
            <strong>Modo local.</strong> Configure o Supabase para jogar entre aparelhos (README).
          </div>
        )}

        {session && (
          <button className="home-rejoin" onClick={onRejoin} disabled={connecting}>
            <span className="home-rejoin-text">↩ Voltar para a sala</span>
            <span className="home-rejoin-code">{session.code}</span>
          </button>
        )}

        <span className="home-eyebrow">Comece agora</span>

        <button className="btn btn-primary btn-block btn-xl home-create" onClick={submitCreate} disabled={!canCreate || connecting}>
          {connecting ? "Criando…" : "Criar sala"} <span className="arr">→</span>
        </button>
        <p className="home-note">Você vira o anfitrião e comanda as simulações.</p>

        <div className="home-or"><span /> ou entre num código <span /></div>

        <div className="home-codebox">
          <input
            className="home-code-input"
            value={code}
            maxLength={6}
            placeholder="K7Q2"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submitJoin()}
          />
          <button className="btn btn-amber home-enter" onClick={submitJoin} disabled={!canJoin || connecting}>
            Entrar
          </button>
        </div>

        {account && (
          <div className="home-team">
            <div className="home-team-meta">
              <span className="home-team-label">Seu time</span>
              <span className="home-team-name">{name.trim() ? name : (account.team_name || "Sem time definido")}</span>
            </div>
          </div>
        )}

        <input
          className="home-name-input"
          value={name}
          maxLength={18}
          placeholder="Seu nome de técnico…"
          onChange={(e) => { nameTouched.current = true; setName(e.target.value); }}
          onKeyDown={(e) => e.key === "Enter" && (canJoin ? submitJoin() : submitCreate())}
        />

        {error && <div className="form-error">{error}</div>}
      </div>
    </div>
  );
}
