-- ============================================================================
-- A5 (PASSO FINAL) — Endurecer a RLS da tabela `rooms`.
--
-- ✅ APLICADO em 2026-06-26 (migração `harden_rooms_rls`), após o merge da
--    migração para a `main`. Removeu o acesso anônimo total e escopou as
--    escritas ao anfitrião/membros. Mantido aqui como registro/source-of-truth.
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
