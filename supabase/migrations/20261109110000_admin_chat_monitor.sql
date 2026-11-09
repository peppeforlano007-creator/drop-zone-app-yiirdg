-- Admin chat monitoring: per-admin "read up to" marker per group + overview RPC.
-- Additive only: no existing table or policy is changed.

create table if not exists public.admin_chat_reads (
  admin_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (admin_id, group_id)
);

alter table public.admin_chat_reads enable row level security;

create policy "admin_chat_reads_select_own" on public.admin_chat_reads
  for select using (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );
create policy "admin_chat_reads_insert_own" on public.admin_chat_reads
  for insert with check (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  );
create policy "admin_chat_reads_update_own" on public.admin_chat_reads
  for update using (
    admin_id = auth.uid()
    and exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'admin')
  ) with check (admin_id = auth.uid());

-- Groups with unread count for the calling admin. Groups never opened by this
-- admin count only messages from the feature launch onwards (no historic flood).
create or replace function public.admin_chat_overview()
returns table (
  group_id uuid,
  name text,
  group_type text,
  pickup_point_name text,
  member_count bigint,
  last_message_at timestamptz,
  last_message_type text,
  last_message_content text,
  last_sender_name text,
  unread_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.name,
    g.group_type,
    pp.name,
    (select count(*) from chat_group_members m where m.group_id = g.id),
    lm.created_at,
    lm.message_type,
    lm.content,
    lp.full_name,
    (select count(*) from chat_messages cm
      where cm.group_id = g.id
        and cm.sender_id <> auth.uid()
        and cm.created_at > coalesce(r.last_read_at, timestamptz '2026-11-09 00:00:00+00'))
  from chat_groups g
  left join pickup_points pp on pp.id = g.pickup_point_id
  left join admin_chat_reads r on r.group_id = g.id and r.admin_id = auth.uid()
  left join lateral (
    select cm.created_at, cm.message_type, cm.content, cm.sender_id
    from chat_messages cm where cm.group_id = g.id
    order by cm.created_at desc, cm.id desc limit 1
  ) lm on true
  left join profiles lp on lp.user_id = lm.sender_id
  where g.deleted_at is null
  order by lm.created_at desc nulls last, g.created_at desc;
end;
$$;

revoke all on function public.admin_chat_overview() from public, anon;
grant execute on function public.admin_chat_overview() to authenticated;
