# FutDraft ⚽

Copa de futebol online para jogar com os amigos. Cada participante entra na sala por um código (sem cadastro), todos montam seus times em um **draft** e disputam um campeonato — **mata-mata** ou **pontos corridos**. Funciona muito bem no celular.

A simulação das partidas é animada em um placar estilo transmissão, com gols minuto a minuto, pênaltis no mata-mata, artilheiro e troféu para o campeão.

---

## Como funciona para os jogadores

1. Uma pessoa cria a sala e compartilha o **código** (algo como `K7Q2`).
2. Cada amigo abre o site, digita o nome de técnico e o código — **sem nenhum cadastro**.
3. Quando todos entram, o anfitrião inicia o **draft**: os técnicos escolhem jogadores em rodadas de ida e volta.
4. O campeonato começa. O anfitrião comanda as simulações; a tela de todos atualiza sozinha.

O estado da partida fica salvo no servidor, de modo que ninguém precisa manter uma aba aberta e a sala sobrevive a quedas de conexão.

---

## Configuração (feita uma única vez por você)

O jogo usa o **Supabase** (plano gratuito) como servidor de tempo real. Os jogadores nunca criam conta — apenas você faz esta configuração inicial, que leva cerca de cinco minutos.

### 1. Crie um projeto no Supabase

Acesse <https://supabase.com>, crie uma conta gratuita e clique em **New project**. Defina um nome e uma senha para o banco de dados (guarde-a) e aguarde o provisionamento.

### 2. Crie a tabela da sala

No painel do projeto, abra **SQL Editor**, cole o trecho abaixo e clique em **Run**:

```sql
create table if not exists public.rooms (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

create policy "anon all" on public.rooms
  for all using (true) with check (true);

alter publication supabase_realtime add table public.rooms;
```

Isso cria a tabela das salas, libera o acesso anônimo (apropriado para um jogo casual entre amigos) e habilita as atualizações em tempo real.

### 3. Copie suas chaves

No painel, vá em **Project Settings → API** e copie dois valores:

- **Project URL** → variável `VITE_SUPABASE_URL`
- **anon public** (em *Project API keys*) → variável `VITE_SUPABASE_ANON_KEY`

### 4. Configure o projeto localmente

Copie o arquivo de exemplo e preencha com as duas chaves:

```bash
cp .env.example .env
```

O `.env` deve ficar assim:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

### 5. Rode localmente

```bash
npm install
npm run dev
```

Abra o endereço exibido (geralmente <http://localhost:5173>). Para testar o multiplayer, abra a mesma sala em **duas abas** ou em dois aparelhos na mesma rede.

---

## Publicação na Vercel

1. Envie este projeto para um repositório no GitHub.
2. Em <https://vercel.com>, clique em **Add New → Project** e importe o repositório. A Vercel detecta o Vite automaticamente — não é preciso ajustar o comando de build.
3. Antes de concluir, abra **Environment Variables** e cadastre as mesmas duas chaves do `.env`:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em **Deploy**. Ao final, compartilhe a URL gerada com os amigos.

> Caso adicione as variáveis depois do primeiro deploy, faça um novo deploy (ou *Redeploy*) para que passem a valer.

---

## Modo local (sem configuração)

Se as chaves do Supabase não estiverem definidas, o jogo entra automaticamente em **modo local**: tudo funciona na mesma tela e sincroniza apenas entre abas do mesmo navegador. É útil para conhecer o jogo antes da configuração, mas **não permite jogar entre aparelhos diferentes**. Para o multiplayer real, conclua a configuração do Supabase descrita acima.

---

## Estrutura do projeto

```
src/
  engine/      Regras do jogo (geração de jogadores, draft, simulação, campeonato)
  lib/         Identidade anônima, cliente Supabase e camada de rede (sala)
  components/  Telas em React (início, lobby, draft, campeonato, partida, campeão)
  App.jsx      Orquestrador: estado da sala, sincronização e navegação entre telas
  styles.css   Sistema de design (tema estádio à noite)
```

---

## Comandos

| Comando           | Função                                         |
| ----------------- | ---------------------------------------------- |
| `npm run dev`     | Ambiente de desenvolvimento com recarga automática |
| `npm run build`   | Gera a versão de produção em `dist/`           |
| `npm run preview` | Pré-visualiza localmente a versão de produção  |

---

## Resolução de problemas

- **"Sala não encontrada"** — confira se o código foi digitado corretamente e se o anfitrião realmente criou a sala. Códigos não diferenciam maiúsculas de minúsculas.
- **A tela não atualiza para os outros jogadores** — verifique se o passo do `alter publication supabase_realtime add table public.rooms;` foi executado e se as variáveis de ambiente estão corretas na Vercel.
- **Aparece "modo local" sem querer** — significa que as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` não foram carregadas. Confira o `.env` (local) ou as *Environment Variables* (Vercel) e refaça o deploy.
