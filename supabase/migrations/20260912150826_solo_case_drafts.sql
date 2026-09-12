create table if not exists public.solo_case_drafts (
  id uuid primary key default gen_random_uuid(),
  law_firm_id uuid not null references public.law_firms(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resumed_at timestamptz,
  archived_at timestamptz
);

create index if not exists solo_case_drafts_owner_idx
  on public.solo_case_drafts(law_firm_id, created_by, updated_at desc)
  where archived_at is null;

alter table public.solo_case_drafts enable row level security;

drop policy if exists "solo case drafts select" on public.solo_case_drafts;
create policy "solo case drafts select"
on public.solo_case_drafts for select to authenticated
using (
  created_by = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
  and archived_at is null
);

drop policy if exists "solo case drafts insert" on public.solo_case_drafts;
create policy "solo case drafts insert"
on public.solo_case_drafts for insert to authenticated
with check (
  created_by = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
);

drop policy if exists "solo case drafts update" on public.solo_case_drafts;
create policy "solo case drafts update"
on public.solo_case_drafts for update to authenticated
using (
  created_by = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
)
with check (
  created_by = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
);

drop policy if exists "solo case drafts delete" on public.solo_case_drafts;
create policy "solo case drafts delete"
on public.solo_case_drafts for delete to authenticated
using (
  created_by = (select auth.uid())
  and public.has_law_firm_role(law_firm_id, array['proprietario', 'administrador', 'advogado']::public.member_role[])
);
