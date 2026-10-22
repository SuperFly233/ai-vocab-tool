begin;
alter table public.anki_device_requests drop constraint anki_device_requests_kind_check;
alter table public.anki_device_requests add constraint anki_device_requests_kind_check check(kind in ('diagnostics','fushi_read','undo','open_note','dictionary_lookup'));
create table public.anki_dictionary_snapshots(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null references public.anki_device_requests(id),entry_index int not null,selection_key text not null,
 query text not null,payload jsonb not null,hash text not null,created_at timestamptz not null default now(),
 unique(user_id,request_id,entry_index,selection_key),check(octet_length(payload::text)<=220000)
);
create index anki_dictionary_owner_query on public.anki_dictionary_snapshots(user_id,query,created_at desc);
alter table public.anki_dictionary_snapshots enable row level security;
revoke all on public.anki_dictionary_snapshots from public,anon,authenticated;

alter function public.anki_device_command(text,jsonb) rename to anki_device_command_v2;
revoke all on function public.anki_device_command_v2(text,jsonb) from public,anon,authenticated;
create function public.anki_device_command(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();req public.anki_device_requests;device uuid;value jsonb;entry jsonb;sense jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='device_request' and args->>'kind'='dictionary_lookup' then
  device:=(args->>'deviceId')::uuid;
  if not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Device unavailable' using errcode='42501';end if;
  if jsonb_typeof(args->'query') is distinct from 'string' or length(trim(args->>'query')) not between 1 and 200
   or jsonb_typeof(args->'dictionary') is distinct from 'string' or length(args->>'dictionary') not between 1 and 200 then raise exception 'Invalid dictionary query';end if;
  if (select count(*) from public.anki_device_requests where user_id=uid and device_id=device and status in ('waiting','working'))>=20 then raise exception 'Too many pending requests';end if;
  insert into public.anki_device_requests(user_id,device_id,kind,payload) values(uid,device,'dictionary_lookup',jsonb_build_object('query',trim(args->>'query'),'dictionary',args->>'dictionary')) returning * into req;
  return to_jsonb(req)-'user_id'-'lease_token'-'lease_until';
 end if;
 if action='device_result' then
  select * into req from public.anki_device_requests where id=(args->>'requestId')::uuid and user_id=uid for update;
  if req.kind='dictionary_lookup' and args->>'error' is null then
   perform public.anki_device_command_v2('device_heartbeat',args);
   value:=args->'result';
   if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>220000 or value->>'dictionary' is distinct from req.payload->>'dictionary'
    or value->>'query' is distinct from req.payload->>'query' or jsonb_typeof(value->'entries') is distinct from 'array' then raise exception 'Invalid dictionary result';end if;
   if jsonb_array_length(value->'entries')>10 then raise exception 'Too many entries';end if;
   for entry in select * from jsonb_array_elements(value->'entries') loop
    if jsonb_typeof(entry->'html') is distinct from 'string' or jsonb_typeof(entry->'headword') is distinct from 'string' or length(entry->>'headword')>400 or coalesce(entry->>'hash','')!~'^[a-f0-9]{64}$'
     or jsonb_typeof(entry->'senses') is distinct from 'array' then raise exception 'Invalid dictionary entry';end if;
    if entry->>'hash' is distinct from encode(sha256(convert_to(entry->>'html','UTF8')),'hex')
     or jsonb_array_length(entry->'senses') not between 1 and 1000 then raise exception 'Invalid dictionary entry integrity';end if;
    for sense in select * from jsonb_array_elements(entry->'senses') loop
     if jsonb_typeof(sense->'html') is distinct from 'string' or coalesce(sense->>'id','')!~'^[a-f0-9]{64}$' then raise exception 'Invalid dictionary sense';end if;
     if sense->>'id' is distinct from encode(sha256(convert_to(sense->>'html','UTF8')),'hex') then raise exception 'Invalid dictionary sense integrity';end if;
    end loop;
   end loop;
   return public.anki_device_command_v2(action,jsonb_set(args,'{result}',jsonb_build_object('dictionary',value->>'dictionary','query',value->>'query','entries',value->'entries','textOnly',true)));
  end if;
 end if;
 return public.anki_device_command_v2(action,args);
end $$;
revoke all on function public.anki_device_command(text,jsonb) from public,anon;
grant execute on function public.anki_device_command(text,jsonb) to authenticated;

create function public.anki_dictionary(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();req public.anki_device_requests;snap public.anki_dictionary_snapshots;entry jsonb;selected jsonb;payload jsonb;card jsonb;index_value int;selection text;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='dictionary_list' then
  return coalesce((select jsonb_agg(to_jsonb(s)-'user_id'-'payload' order by s.created_at desc) from (select * from public.anki_dictionary_snapshots where user_id=uid and query=lower(trim(args->>'query')) order by created_at desc limit 20)s),'[]');
 elsif action='dictionary_get' then
  select * into snap from public.anki_dictionary_snapshots where id=(args->>'snapshotId')::uuid and user_id=uid;
  if snap.id is null then raise exception 'Snapshot unavailable' using errcode='42501';end if;
  return (to_jsonb(snap)-'user_id')||jsonb_build_object('canonical',snap.payload::text);
 elsif action='dictionary_save' then
  select * into req from public.anki_device_requests where id=(args->>'requestId')::uuid and user_id=uid and kind='dictionary_lookup' and status='complete';
  if req.id is null then raise exception 'Dictionary lookup unavailable' using errcode='42501';end if;
  index_value:=(args->>'entryIndex')::int;entry:=req.result->'entries'->index_value;
  if index_value<0 or entry is null or jsonb_typeof(args->'senseIds') is distinct from 'array' then raise exception 'Select dictionary senses';end if;
  if jsonb_array_length(args->'senseIds') not between 1 and 100 then raise exception 'Select 1-100 senses';end if;
  if exists(select 1 from jsonb_array_elements_text(args->'senseIds') id where not exists(select 1 from jsonb_array_elements(entry->'senses') s where s->>'id'=id)) then raise exception 'Unknown sense';end if;
  select jsonb_agg(s order by ord) into selected from jsonb_array_elements(entry->'senses') with ordinality t(s,ord) where args->'senseIds' ? (s->>'id');
  payload:=jsonb_build_object('dictionary',req.result->>'dictionary','headword',entry->>'headword','reading',entry->>'reading','senses',selected,'textOnly',true);
  selection:=md5(selected::text);
  insert into public.anki_dictionary_snapshots(user_id,request_id,entry_index,selection_key,query,payload,hash)
   values(uid,req.id,index_value,selection,lower(trim(req.payload->>'query')),payload,encode(sha256(convert_to(payload::text,'UTF8')),'hex'))
   on conflict(user_id,request_id,entry_index,selection_key) do nothing;
  select * into snap from public.anki_dictionary_snapshots where user_id=uid and request_id=req.id and entry_index=index_value and selection_key=selection;
  return (to_jsonb(snap)-'user_id')||jsonb_build_object('canonical',snap.payload::text);
 end if;
 raise exception 'Unsupported dictionary action';
end $$;
revoke all on function public.anki_dictionary(text,jsonb) from public,anon;
grant execute on function public.anki_dictionary(text,jsonb) to authenticated;

alter function public.anki_bridge(text,jsonb) rename to anki_bridge_v2;
revoke all on function public.anki_bridge_v2(text,jsonb) from public,anon,authenticated;
create function public.anki_bridge(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();card jsonb;job jsonb;old_payload jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='health' then return public.anki_bridge_v2(action,args)||jsonb_build_object('bridgeVersion','0.3.0','payloadVersions',jsonb_build_array(1,2,3),'dictionary',true);end if;
 if action='submit' and args->'payload'->>'version'='3' then
  select payload into old_payload from public.anki_jobs where user_id=uid and device_id=(args->>'deviceId')::uuid and dedupe=args->>'dedupe';
  if old_payload is not null and old_payload is distinct from args->'payload' then raise exception 'Immutable task content differs' using errcode='40001';end if;
  for card in select * from jsonb_array_elements(args->'payload'->'cards') loop
   if card ? 'dictionaryRef' and not exists(select 1 from public.anki_dictionary_snapshots where id=(card->'dictionaryRef'->>'id')::uuid and user_id=uid and hash=card->'dictionaryRef'->>'hash') then raise exception 'Dictionary snapshot unavailable' using errcode='42501';end if;
  end loop;
  job:=public.anki_bridge_v2(action,jsonb_set(args,'{payload,version}','2'));
  if job->'payload' is distinct from args->'payload' and job->'payload' is distinct from jsonb_set(args->'payload','{version}','2') then raise exception 'Immutable task content differs' using errcode='40001';end if;
  update public.anki_jobs set payload=args->'payload' where id=(job->>'id')::uuid and user_id=uid;
  return jsonb_set(job,'{payload}',args->'payload');
 end if;
 return public.anki_bridge_v2(action,args);
end $$;
revoke all on function public.anki_bridge(text,jsonb) from public,anon;
grant execute on function public.anki_bridge(text,jsonb) to authenticated;
commit;
