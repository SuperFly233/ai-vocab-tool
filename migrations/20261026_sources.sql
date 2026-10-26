begin;
create schema if not exists lexi_private;
revoke all on schema lexi_private from public,anon;
grant usage on schema lexi_private to authenticated;
create table public.lexi_sources_catalog(
 user_id uuid not null references auth.users(id) on delete cascade,id uuid not null,
 name text not null check(length(btrim(name)) between 1 and 200),
 kind text not null check(kind in ('game','animation','book','video','other')),
 aliases jsonb not null default '[]' check(jsonb_typeof(aliases)='array' and jsonb_array_length(aliases)<=30),
 revision integer not null check(revision>0),deleted boolean not null default false,
 updated_at timestamptz not null default now(),primary key(user_id,id));
create table public.lexi_source_names(user_id uuid not null,id uuid not null,name_key text not null,
 primary key(user_id,name_key),foreign key(user_id,id) references public.lexi_sources_catalog(user_id,id) on delete cascade);
alter table public.lexi_sources_catalog enable row level security;
alter table public.lexi_source_names enable row level security;
create policy lexi_sources_owner on public.lexi_sources_catalog for select to authenticated using((select auth.uid())=user_id);
revoke all on public.lexi_sources_catalog,public.lexi_source_names from public,anon,authenticated;
grant select on public.lexi_sources_catalog to authenticated;
create table public.lexi_teyvat_coverage(chapter text primary key,version text not null,line_count integer not null check(line_count>=0),catalog_total integer not null default 0 check(catalog_total>=0),indexed_at timestamptz not null default now());
create table public.lexi_teyvat_lines(key text primary key,chapter text not null references public.lexi_teyvat_coverage(chapter),version text not null,en text not null,zh text not null,en_key text not null,zh_key text not null,title text not null,url text not null);
create index lexi_teyvat_en on public.lexi_teyvat_lines(en_key);
create index lexi_teyvat_zh on public.lexi_teyvat_lines(zh_key);
alter table public.lexi_teyvat_lines enable row level security;
alter table public.lexi_teyvat_coverage enable row level security;
revoke all on public.lexi_teyvat_lines,public.lexi_teyvat_coverage from public,anon,authenticated;
create table lexi_private.teyvat_import (like public.lexi_teyvat_lines including all);
alter table lexi_private.teyvat_import enable row level security;
revoke all on lexi_private.teyvat_import from public,anon,authenticated;
create function lexi_private.source_key(value text) returns text language sql immutable set search_path=pg_catalog
as $$select lower(btrim(regexp_replace(normalize(value,NFKC),'\s+',' ','g')))$$;
create function lexi_private.sources(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); previous public.lexi_sources_catalog; result jsonb; sid uuid; alias_value jsonb; name_keys text[]; source_name text; source_kind text; source_aliases jsonb; expected integer;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>20000 then raise exception 'Invalid input' using errcode='22023';end if;
 if action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'type',kind,'aliases',aliases,'revision',revision,'deleted',deleted,'updatedAt',updated_at) order by name),'[]') into result from public.lexi_sources_catalog where user_id=uid;return result;
 elsif action='save' then
  sid:=(args->>'id')::uuid;source_name:=btrim(args->>'name');source_kind:=args->>'type';source_aliases:=args->'aliases';expected:=(args->>'expectedRevision')::integer;
  if sid is null or source_name is null or length(source_name) not between 1 and 200 or source_kind is null or source_kind not in ('game','animation','book','video','other') or source_aliases is null or jsonb_typeof(source_aliases)<>'array' or jsonb_array_length(source_aliases)>30 or expected is null or expected<0 then raise exception 'Invalid source' using errcode='22023';end if;
  name_keys:=array[lexi_private.source_key(source_name)];
  for alias_value in select value from jsonb_array_elements(source_aliases) loop
   if jsonb_typeof(alias_value)<>'string' or length(btrim(alias_value#>>'{}')) not between 1 and 200 then raise exception 'Invalid alias' using errcode='22023';end if;
   name_keys:=array_append(name_keys,lexi_private.source_key(alias_value#>>'{}'));
  end loop;
  perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
  select * into previous from public.lexi_sources_catalog where user_id=uid and id=sid for update;
  if coalesce(previous.revision,0)<>expected then raise exception 'Source conflict' using errcode='40001';end if;
  if exists(select 1 from public.lexi_source_names where user_id=uid and id<>sid and name_key=any(name_keys)) then raise exception 'Source name or alias collision' using errcode='23505';end if;
  insert into public.lexi_sources_catalog(user_id,id,name,kind,aliases,revision,deleted) values(uid,sid,source_name,source_kind,source_aliases,coalesce(previous.revision,0)+1,false)
  on conflict(user_id,id) do update set name=excluded.name,kind=excluded.kind,aliases=excluded.aliases,revision=excluded.revision,updated_at=now();
  delete from public.lexi_source_names where user_id=uid and id=sid;
  insert into public.lexi_source_names select uid,sid,k from unnest(name_keys) k group by k;
  return jsonb_build_object('id',sid,'revision',coalesce(previous.revision,0)+1);
 elsif action='coverage' then
  select coalesce(jsonb_agg(to_jsonb(c) order by chapter),'[]') into result from public.lexi_teyvat_coverage c;return result;
 elsif action='search' then
  if args->>'query' is null or length(args->>'query') not between 1 and 4000 then raise exception 'Invalid query' using errcode='22023';end if;
  select coalesce(jsonb_agg(to_jsonb(l)),'[]') into result from (select * from public.lexi_teyvat_lines where en_key=lexi_private.source_key(args->>'query') or zh_key=lexi_private.source_key(args->>'query') order by key limit 21) l;return result;
 end if;
 raise exception 'Invalid action' using errcode='22023';
end $$;
revoke all on function lexi_private.sources(text,jsonb) from public,anon;
grant execute on function lexi_private.sources(text,jsonb) to authenticated;
create function public.lexi_sources(action text,args jsonb default '{}'::jsonb) returns jsonb language sql security invoker set search_path=pg_catalog as $$select lexi_private.sources(action,args)$$;
revoke all on function public.lexi_sources(text,jsonb) from public,anon;
grant execute on function public.lexi_sources(text,jsonb) to authenticated;
commit;
