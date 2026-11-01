begin;
create or replace function lexi_private.source_key(value text) returns text language sql immutable set search_path=pg_catalog
as $$select lower(btrim(regexp_replace(regexp_replace(normalize(value,NFKC),'\s+',' ','g'),'\s*:\s*',':','g')))$$;
-- Rebuild keys atomically. A newly colliding legacy alias aborts, never merges works.
delete from public.lexi_source_names;
insert into public.lexi_source_names(user_id,id,name_key)
select distinct s.user_id,s.id,lexi_private.source_key(n.value)
from public.lexi_sources_catalog s cross join lateral jsonb_array_elements_text(jsonb_build_array(s.name)||s.aliases) n(value)
where not s.deleted;
create table public.lexi_source_nodes(
 user_id uuid not null,id uuid not null,work_id uuid not null,parent_id uuid,
 kind text not null check(kind in ('season','volume','arc','part','episode','chapter','quest','section')),
 name text not null check(length(btrim(name)) between 1 and 200),name_key text not null,
 revision integer not null check(revision>0),updated_at timestamptz not null default now(),
 primary key(user_id,id),
 foreign key(user_id,work_id) references public.lexi_sources_catalog(user_id,id),
 foreign key(user_id,parent_id) references public.lexi_source_nodes(user_id,id));
create unique index lexi_source_node_scope on public.lexi_source_nodes(user_id,work_id,coalesce(parent_id,work_id),kind,name_key);
create table public.lexi_source_confirmations(
 user_id uuid not null,request_key text not null check(length(request_key) between 1 and 800),source_id uuid not null,
 primary key(user_id,request_key),foreign key(user_id,source_id) references public.lexi_sources_catalog(user_id,id));
alter table public.lexi_source_nodes enable row level security;
alter table public.lexi_source_confirmations enable row level security;
revoke all on public.lexi_source_nodes,public.lexi_source_confirmations from public,anon,authenticated;
grant select on public.lexi_source_nodes to authenticated;
create policy lexi_source_nodes_owner on public.lexi_source_nodes for select to authenticated using((select auth.uid())=user_id);
create function lexi_private.source_hierarchy(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); result jsonb; sid uuid; pid uuid; nid uuid; request_identity text; nname text; nkind text;
 current_source public.lexi_sources_catalog; previous public.lexi_source_nodes; parent public.lexi_source_nodes; aliases jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if jsonb_typeof(args)<>'object' or octet_length(args::text)>20000 then raise exception 'Invalid input' using errcode='22023';end if;
 if action='catalog' then
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'type',s.kind,'aliases',s.aliases,'revision',s.revision,'deleted',s.deleted,'nodes',
   coalesce((select jsonb_agg(jsonb_build_object('id',n.id,'workId',n.work_id,'parentId',n.parent_id,'kind',n.kind,'name',n.name,'revision',n.revision) order by n.parent_id nulls first,n.name) from public.lexi_source_nodes n where n.user_id=uid and n.work_id=s.id),'[]'::jsonb)) order by s.name),'[]'::jsonb)
   into result from public.lexi_sources_catalog s where s.user_id=uid;return result;
 elsif action='resolve' then
  if args->>'name' is null or length(args->>'name') not between 1 and 200 then raise exception 'Invalid name' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'type',s.kind)),'[]'::jsonb) into result
   from public.lexi_sources_catalog s join public.lexi_source_names k on k.user_id=s.user_id and k.id=s.id
   where s.user_id=uid and not s.deleted and k.name_key=lexi_private.source_key(args->>'name');return result;
 end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if action='confirm' then
  request_identity:=args->>'requestKey';
  if request_identity is null or length(request_identity) not between 1 and 800 then raise exception 'Invalid confirmation' using errcode='22023';end if;
  select c.source_id into sid from public.lexi_source_confirmations c where c.user_id=uid and c.request_key=request_identity;
  if sid is null then
   if nullif(args->>'existingId','') is not null then
    select * into current_source from public.lexi_sources_catalog where user_id=uid and id=(args->>'existingId')::uuid and not deleted for update;
    if current_source.id is null then raise exception 'Unknown work' using errcode='22023';end if;
    sid:=current_source.id;
    select coalesce(jsonb_agg(distinct value),'[]'::jsonb) into aliases from jsonb_array_elements(current_source.aliases||coalesce(args->'aliases','[]'::jsonb));
    perform lexi_private.sources('save',jsonb_build_object('id',sid,'name',current_source.name,'type',current_source.kind,'aliases',aliases,'expectedRevision',current_source.revision));
   else
    sid:=gen_random_uuid();
    perform lexi_private.sources('save',jsonb_build_object('id',sid,'name',args->>'name','type',args->>'type','aliases',args->'aliases','expectedRevision',0));
   end if;
   insert into public.lexi_source_confirmations values(uid,request_identity,sid);
  end if;
  select value into result from jsonb_array_elements(lexi_private.source_hierarchy('catalog','{}'::jsonb)) where value->>'id'=sid::text;
  return result;
 elsif action='node' then
  sid:=(args->>'workId')::uuid;pid:=nullif(args->>'parentId','')::uuid;nkind:=args->>'kind';nname:=btrim(args->>'name');
  if sid is null or nname is null or length(nname) not between 1 and 200 or nkind is null or nkind not in ('season','volume','arc','part','episode','chapter','quest','section') then raise exception 'Invalid node' using errcode='22023';end if;
  if not exists(select 1 from public.lexi_sources_catalog where user_id=uid and id=sid and not deleted) then raise exception 'Unknown work' using errcode='22023';end if;
  if pid is not null then
   select * into parent from public.lexi_source_nodes where user_id=uid and id=pid and work_id=sid;
   if parent.id is null or parent.parent_id is not null then raise exception 'Invalid parent or depth' using errcode='22023';end if;
  end if;
  nid:=nullif(args->>'id','')::uuid;
  if nid is not null then
   select * into previous from public.lexi_source_nodes where user_id=uid and id=nid for update;
   if previous.id is null or previous.revision<>coalesce((args->>'expectedRevision')::integer,-1) then raise exception 'Node conflict' using errcode='40001';end if;
   if previous.work_id<>sid or previous.parent_id is distinct from pid then raise exception 'Cannot reparent implicitly' using errcode='22023';end if;
   update public.lexi_source_nodes set name=nname,name_key=lexi_private.source_key(nname),revision=previous.revision+1,updated_at=now() where user_id=uid and id=nid;
  else
   select id into nid from public.lexi_source_nodes where user_id=uid and work_id=sid and parent_id is not distinct from pid and kind=nkind and name_key=lexi_private.source_key(nname);
   if nid is null then nid:=gen_random_uuid();insert into public.lexi_source_nodes values(uid,nid,sid,pid,nkind,nname,lexi_private.source_key(nname),1,now());end if;
  end if;
  select jsonb_build_object('id',n.id,'workId',n.work_id,'parentId',n.parent_id,'kind',n.kind,'name',n.name,'revision',n.revision) into result from public.lexi_source_nodes n where n.user_id=uid and n.id=nid;
  return result;
 end if;
 raise exception 'Invalid action' using errcode='22023';
end $$;
revoke all on function lexi_private.source_hierarchy(text,jsonb) from public,anon;
grant execute on function lexi_private.source_hierarchy(text,jsonb) to authenticated;
create function public.lexi_source_hierarchy(action text,args jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path=pg_catalog as $$select lexi_private.source_hierarchy(action,args)$$;
revoke all on function public.lexi_source_hierarchy(text,jsonb) from public,anon;
grant execute on function public.lexi_source_hierarchy(text,jsonb) to authenticated;
commit;
