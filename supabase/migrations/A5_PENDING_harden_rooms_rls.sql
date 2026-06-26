-- ============================================================================
-- A5 (PASSO FINAL) — Endurecer a RLS da tabela `rooms`.
--
-- ⚠️ NÃO APLICAR AINDA. Aplique SOMENTE depois que a branch
--    `feat/supabase-migration` estiver MERGEADA na `main` e DEPLOYADA.
--
-- Motivo: hoje a `main` (em produção) ainda acessa a sala como um blob anônimo
-- (`rooms.state` via policy temporária "anon all"). Se trocarmos para
-- authenticated-only antes do deploy do front novo, a `main` quebra na hora.
--
-- Como aplicar (depois do merge+deploy): rode este SQL via
--   Supabase MCP apply_migration  OU  supabase db push  OU  o SQL editor.
-- ============================================================================

-- 1) Remove o acesso anônimo total (temporário) da `rooms`.
drop policy if exists "anon all" on public.rooms;

-- 2) Leitura: qualquer usuário autenticado pode ler a sala (settings/phase/state).
create policy rooms_select_auth on public.rooms
  for select to authenticated
  using (true);

-- 3) Criar sala: só autenticado e como anfitrião de si mesmo.
create policy rooms_insert_host on public.rooms
  for insert to authenticated
  with check (host_id = auth.uid());

-- 4) Atualizar a sala (settings/phase/state/host): o anfitrião OU um membro da sala.
--    Incluímos "membro" para preservar o "assumir o comando" (claimHost) quando o
--    anfitrião cai — um membro precisa poder gravar host_id = seu uid.
create policy rooms_update_member on public.rooms
  for update to authenticated
  using (
    host_id = auth.uid()
    or exists (select 1 from public.room_players rp where rp.room_id = rooms.id and rp.user_id = auth.uid())
  )
  with check (
    host_id = auth.uid()
    or exists (select 1 from public.room_players rp where rp.room_id = rooms.id and rp.user_id = auth.uid())
  );

-- 5) Apagar sala: só o anfitrião (o cron já limpa salas antigas automaticamente).
create policy rooms_delete_host on public.rooms
  for delete to authenticated
  using (host_id = auth.uid());

-- 6) (Opcional) Depois que tudo estiver lendo das tabelas e o histórico migrado,
--    o blob deixa de ser usado e a coluna pode sair:
-- alter table public.rooms drop column state;
