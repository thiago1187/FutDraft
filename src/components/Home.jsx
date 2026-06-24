import { useState } from "react";
import { Logo, PitchMarks, ChalkLine } from "./bits.jsx";

export default function Home({ onCreate, onJoin, onRejoin, session, connecting, error, isLocal }) {
  const [tab, setTab] = useState("create");
  const [name, setName] = useState(session?.name || "");
  const [code, setCode] = useState("");

  const canCreate = name.trim().length >= 2;
  const canJoin = name.trim().length >= 2 && code.trim().length >= 3;

  function submitCreate() {
    if (canCreate && !connecting) onCreate(name.trim());
  }
  function submitJoin() {
    if (canJoin && !connecting) onJoin(code.trim().toUpperCase(), name.trim());
  }

  return (
    <div className="screen home">
      <div className="home-hero">
        <div className="pitch-bg"><PitchMarks /></div>
        <Logo size="lg" />
        <p className="home-tagline">Monte seu time no draft e dispute a copa com a galera.</p>
      </div>

      {isLocal && (
        <div className="banner banner-local">
          <strong>Modo local.</strong> Configure o Supabase para jogar online (instruções no README).
        </div>
      )}

      {session && (
        <button className="btn btn-amber btn-block" onClick={onRejoin} disabled={connecting}>
          ↩ Voltar para a sala {session.code}
        </button>
      )}

      <div className="card home-card">
        <div className="tabs">
          <button className={`tab ${tab === "create" ? "active" : ""}`} onClick={() => setTab("create")}>
            Criar sala
          </button>
          <button className={`tab ${tab === "join" ? "active" : ""}`} onClick={() => setTab("join")}>
            Entrar
          </button>
        </div>

        <label className="field">
          <span className="field-label">Seu nome de técnico</span>
          <input
            className="input"
            value={name}
            maxLength={18}
            placeholder="Ex.: Mano Tite"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (tab === "create" ? submitCreate() : submitJoin())}
          />
        </label>

        {tab === "join" && (
          <label className="field">
            <span className="field-label">Código da sala</span>
            <input
              className="input input-code"
              value={code}
              maxLength={6}
              placeholder="ABCD"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitJoin()}
            />
          </label>
        )}

        {error && <div className="form-error">{error}</div>}

        {tab === "create" ? (
          <button className="btn btn-primary btn-block" onClick={submitCreate} disabled={!canCreate || connecting}>
            {connecting ? "Criando…" : "Criar sala"}
          </button>
        ) : (
          <button className="btn btn-primary btn-block" onClick={submitJoin} disabled={!canJoin || connecting}>
            {connecting ? "Entrando…" : "Entrar na sala"}
          </button>
        )}
      </div>

      <ChalkLine label="como funciona" />
      <ol className="how">
        <li><span>1</span> Você cria a sala e compartilha o código.</li>
        <li><span>2</span> Cada um entra pelo código — sem cadastro.</li>
        <li><span>3</span> Draft dos jogadores e a copa começa.</li>
      </ol>
    </div>
  );
}
