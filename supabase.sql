create table if not exists public.study_store (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists study_store_user_updated_idx
  on public.study_store (user_id, updated_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists study_store_set_updated_at on public.study_store;
create trigger study_store_set_updated_at
before update on public.study_store
for each row
execute function public.set_updated_at();

alter table public.study_store enable row level security;

drop policy if exists "study_store_select_own" on public.study_store;
create policy "study_store_select_own"
on public.study_store
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "study_store_insert_own" on public.study_store;
create policy "study_store_insert_own"
on public.study_store
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "study_store_update_own" on public.study_store;
create policy "study_store_update_own"
on public.study_store
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "study_store_delete_own" on public.study_store;
create policy "study_store_delete_own"
on public.study_store
for delete
to authenticated
using ((select auth.uid()) = user_id);
