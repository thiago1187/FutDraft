# FutDraft — Handoff técnico (estado atual + meta: tudo no Supabase)

> Documento para passar a um Claude novo. Começa pelo **banco de dados** (o que hoje está
> no front vs. no Supabase) porque a meta é **mover TUDO pro Supabase e nada pelo front**:
> auth, perfis, salas, partidas, torneios e histórico. Depois descreve o jogo inteiro.

---

## 0. A META (o que eu quero)

Hoje quase tudo que é "sessão/identidade/sala" vive **no front** (React + `localStorage`), e o
Supabase é praticamente só um **blob JSONB + relay de tempo real**. **Quero o contrário:**
**auth, perfis, salas, jogadores, draft, torneio, partidas e histórico no Supabase**, com
**RLS** de verdade e, idealmente, **lógica autoritativa no servidor** (Edge Functions /
Postgres). O front deve virar **só apresentação**.

---

## 1. BANCO DE DADOS HOJE — o que está onde

### 1.1 No Supabase (projeto `mcufbuiholfbxqmvmfkv`, Postgres 17, us-west-2)
Tabelas que EXISTEM hoje (todas com RLS habilitado):

| Tabela | Linhas | Papel | Usada pelo app? |
|---|---|---|---|
| **`rooms`** | 99 | `id text PK`, `state jsonb`, `updated_at`. ⚠️ **A SALA/PARTIDA INTEIRA vive aqui** (lobby, players, draft, torneio, fase) num único blob `state`. | ✅ sim (o coração) |
| **`wc_squads`** | 250 | Seleções reais (slug, país, ano, médias, lendas). **Só leitura.** | ✅ sim |
| **`wc_players`** | 5.613 | Jogadores reais (overall, bucket GOL/ZAG/MEI/ATA, posições, lenda). **Só leitura.** | ✅ sim |
| `copas` | 23 | Esquema ANTIGO em PT (ano, país-sede, campeão). | ❌ não |
| `selecoes` | 169 | Esquema antigo (FK → copas). | ❌ não |
| `jogadores` | 0 | Esquema antigo, **vazio**. | ❌ não |

> ⚠️ **Decidir:** `copas/selecoes/jogadores` é um esquema paralelo (provavelmente import
> antigo) que **o front não usa** e está parcialmente vazio. Migrar para ele OU descartar.

### 1.2 No FRONT / aparelho (localStorage + React) — **o que eu quero TIRAR daqui**
- **Identidade:** `futdraft_cid` = id anônimo aleatório no `localStorage` (`src/lib/id.js`).
  **NÃO existe login. NÃO existe tabela `profiles`.**
- **Sessão:** `futdraft_session` = `{code,name}` só pra reentrar na sala após F5.
- **Perfil do jogador** (nome, nome do time, escudo/emoji, cor) é **gerado no cliente**
  (`makePlayer` em `src/App.jsx`) e gravado **só dentro de `rooms.state.players[]`**.
  Não persiste por usuário, some quando a sala morre.
- **TODA a lógica de jogo** roda no **navegador do anfitrião** (host-autoritativo). O
  Supabase **não valida nada** — qualquer cliente com a chave anon pode ler/escrever o blob.
- **Modo local** (sem Supabase): salas em `localStorage` (`futdraft_local_*`) +
  `BroadcastChannel` entre abas. É fallback de teste.

### 1.3 Como a sincronização funciona hoje (`src/lib/net.js`)
- `openRoom(code)` cria/abre uma linha em `rooms` e assina 3 coisas no Realtime:
  1. **`postgres_changes`** na linha → recebe o `state` novo (estado "lento": lobby, draft,
     resultado).
  2. **`presence`** → quem está online (por `clientId`).
  3. **canal `broadcast` "fd"** → comandos e **snapshots ao vivo** da partida (~5/s).
- **Host-autoritativo:** o anfitrião roda o motor e faz `setState` (persiste o blob inteiro)
  + `broadcast` dos snapshots. Clientes aplicam o que recebem; quem não é host **não simula**.
- Cliente criado em `src/lib/supabase.js` com **chave anon embutida no código** e
  `auth: { persistSession: false }`. RLS hoje permite leitura/escrita anônima das salas
  (precisa endurecer na migração).

**Resumo:** o Supabase hoje guarda **dados de referência (seleções)** + **um blob de sala**.
Identidade, perfil e autoridade do jogo estão no front. É exatamente isso que a migração ataca.

---

## 2. META — arquitetura-alvo (proposta; o Claude pode ajustar)

### 2.1 Auth & perfis
- Ativar **Supabase Auth**. Opções a decidir: e-mail/senha, OAuth (Google), ou **Anonymous
  Auth** (pra manter o "entrar sem cadastro", mas com `auth.uid()` real e RLS).
- Trocar `clientId()` (localStorage) por **`auth.uid()`** em todo o app.
- Tabela **`profiles`**: `id uuid PK = auth.uid()`, `display_name`, `team_name`, `emoji`,
  `color`, `created_at`. RLS: dono lê/escreve o seu; leitura pública do básico (nome/escudo).

### 2.2 Salas relacionais (sair do blob único `rooms.state`)
- **`rooms`**: `id`, `code`, `host_id → profiles`, `phase`, `settings jsonb`, `status`,
  `created_at`, `updated_at`.
- **`room_players`**: `room_id → rooms`, `user_id → profiles`, `slot`, `is_bot`, `squad_id`,
  `ready bool`, `joined_at`. (Substitui `state.players[]`.)
- **`drafts`** / **`draft_picks`** (pick por slot, jogador, manager).
- **`tournaments`** / **`matches`** (placar, pênaltis, súmula) / **`match_events`**
  (gol, cartão, pênalti, substituição) — para **histórico persistente**.
- **RLS:** só membros da sala leem/escrevem o que é seu; host tem permissões extras
  (iniciar draft, avançar fase). Hoje está tudo aberto via anon — endurecer.

### 2.3 Lógica autoritativa no servidor (decisão de design)
Hoje o **host (browser)** é a autoridade. Duas rotas:
- **(A) Servidor-autoritativo:** mover o motor (`src/engine/*`) para **Edge Functions
  (Deno)**; a função roda a partida e grava `matches`/`match_events`; o front só **assiste**
  via Realtime por tabela. Mais robusto, mais trabalho.
- **(B) Host-autoritativo + persistência relacional:** mantém o host rodando o motor, mas
  grava tudo em tabelas (não no blob) e usa RLS pra impedir trapaça. Menos trabalho.
- **Realtime por tabela** (`room_players`, `matches`, `match_events`) no lugar do broadcast
  de blob, pelo menos para o estado "lento".

### 2.4 Migrações & infra
- Hoje **não há migrations versionadas** (zero `.sql` no repo). Criar `supabase/migrations/`
  e versionar o esquema.
- O motor lê `SQUADS` via `src/data/squads.js` (já consome `wc_squads`/`wc_players`) —
  **manter** (já é Supabase).
- Tirar a chave anon "hardcoded" de `src/lib/supabase.js` e usar só `.env`
  (`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).

---

## 3. O JOGO (contexto do código para o Claude entender)

### 3.1 Stack
**Vite + React 18 (JSX, sem TS)**, CSS puro em `src/styles.css`, deploy Vercel,
`@supabase/supabase-js`. Repo `github.com/thiago1187/FutDraft` (branch `main`; trabalho 2
pessoas: thiago1187 + amigo João Artur). Motor de simulação = **JS puro em `src/engine/`**,
separado do render em `src/components/`.

### 3.2 Fluxo
Home → **Lobby** (config) → **Draft 7a0** (roleta: sorteia país+Copa real e escolhe jogador
para o slot) → **Torneio** (mata-mata / pontos corridos / copa) → **Partida 2D ao vivo** →
**Pós-jogo** → **Campeão**.

### 3.3 Motor de simulação (o coração matemático)
- **`rates.js`** — λ estilo **Dixon-Coles, CAMPO NEUTRO sem mando de campo** (regra
  inviolável: Copa do Mundo é neutra, modelo simétrico). λ = forças por setor (ataque/defesa
  ponderadas + stamina) × multiplicadores: postura (ataque/equilíbrio/retranca), **linha
  defensiva condicional ao elenco** (zaga fraca + linha alta sofre mais), pressão, posse,
  cartões, placar, choque de forma (lognormal). `winprob.js` = Skellam (no backend, **não
  exibido** por escolha).
- **`liveMatch.js`** — motor 2D ao vivo. Gols por **Poisson ancorado no λ**. Estatísticas
  (chutes / no alvo / escanteios) por processo por minuto, escalado pelo λ **e pela tática**.
  Cartões (vão p/ zaga/meio; **2º amarelo expulsa**, joga com 10), **pênalti em jogo**,
  **ready-gate** (todos confirmam "Pronto"), intervalo, e **pós-jogo** (súmula + notas +
  craque + corrida de xG + história por templates).
- **`match.js`** — simulação rápida (torneio / "simular tudo") usa o **mesmo λ**.
- **`tactics.js`** — 6 presets + cálculo de **encaixe** estilo×elenco.
- **`calibrate.js`** — harness `npm run sim:calibrate` (roda N partidas, PASS/FAIL vs. metas).

### 3.4 O que JÁ FUNCIONA (verificado por calibração e screenshots)
- ✅ Draft 7a0 (roleta, regra de ouro, dedup da mesma pessoa, **remanejar com posições
  piscando** mesmo já escalado).
- ✅ Torneio (mata-mata/liga; OVR por time; chaveamento projetado; tabela final).
- ✅ Partida 2D (posse, λ sem mando, táticas que mudam chutes/gols, cartões, intervalo).
- ✅ **Tática ao vivo** (presets + encaixe; **pausar abre a tática**).
- ✅ **Ready-gate** (todos confirmam; host não força; bot×bot começa sozinho; anti-AFK 30s).
- ✅ **Pré-análise** na tela de começar (Ataque/Defesa/Geral + XI de cada time).
- ✅ **Pênaltis**: disputa (mata-mata) + **em jogo** (pausa, mini-tela, timer grande,
  gol/defesa/pra-fora coerentes).
- ✅ **Pós-jogo** (súmula + corrida de xG + história + notas + craque).
- ✅ Editar time/bandeiras em **pop-up**.

### 3.5 Calibração atual (`npm run sim:calibrate` = PASS)
gols **~2,5** · empates **~27%** · **sem mando** (50/50) · chutes **~12/time** (ataque ~18 /
retranca ~7) · conversão **~10%** · **xG ≈ gols** · vermelhos **~0,06/jogo** · pênaltis
**~0,20/jogo** · cartões p/ zaga/meio · **as táticas movem o win%**.

### 3.6 O que NÃO está feito
- ⛔ **Conta/perfil** (é exatamente o foco desta migração).
- ⛔ **Modalidade "Copa vs Seleções"** — botão existe, **lógica não implementada**.
- 🟡 Ready-gates nas outras etapas (entrar/draft) — só o da partida está pronto.
- 🟡 Markov por zonas (do relatório) — simplificado (gols ancorados no λ, que é o objetivo).

---

## 4. Arquivos que importam para a migração

| Arquivo | Papel | Muda na migração? |
|---|---|---|
| `src/lib/supabase.js` | Cria o client (chave anon embutida) | tirar hardcode; manter |
| `src/lib/net.js` | **Toda** a camada de sala (blob `rooms` + realtime + broadcast) | **muda muito** |
| `src/lib/id.js` | Identidade anônima + sessão no localStorage | **vira Auth** |
| `src/App.jsx` | Cria/junta sala, monta o `initialState` (blob), host-autoritativo | muda |
| `src/data/squads.js` | Lê `wc_squads`/`wc_players` (já Supabase) | manter |
| `src/components/*` | Lobby, Draft7a0, Tournament, MatchLive, Champion, PostMatch (UI) | ler de tabelas |
| `src/engine/*` | Motor (liveMatch, rates, match, tactics, calibrate) | candidato a Edge Function |

---

## 5. Decisões a tomar (o Claude deve perguntar isto antes de mexer)
1. **Auth:** e-mail/senha, Google, ou **Anonymous** (manter o "sem cadastro")?
2. **Autoridade:** Edge Function roda a partida (servidor-autoritativo) **ou** mantém
   host-autoritativo gravando relacional?
3. **Esquema antigo** `copas/selecoes/jogadores` (PT): migrar para ele ou **descartar**?
4. **Migrar salas existentes** (99 em `rooms`) ou começar limpo?
5. Manter **modo local** (`localStorage`/`BroadcastChannel`) como fallback offline?

---

## 6. Como rodar/testar
`npm run dev` · `npm run build` · `npm run sim:calibrate` · botão **🛠 DEV** (canto) abre o
`DevHarness` com telas isoladas. Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
