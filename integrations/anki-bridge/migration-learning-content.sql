begin;
alter table public.anki_devices add column capabilities jsonb not null default '{"payloadVersions":[1,2,3]}'::jsonb;
create table public.anki_content_snapshots(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,hash text not null,created_at timestamptz not null default now(),
 unique(user_id,hash),check(octet_length(payload::text)<=220000)
);
alter table public.anki_content_snapshots enable row level security;
revoke all on public.anki_content_snapshots from public,anon,authenticated;
create function public.anki_learning(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();snap public.anki_content_snapshots;p jsonb;k text;row jsonb;head jsonb;field text;group_name text;terms jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='content_get' then
  select * into snap from public.anki_content_snapshots where id=(args->>'snapshotId')::uuid and user_id=uid;
  if snap.id is null then raise exception 'Content unavailable' using errcode='42501';end if;
 elsif action='content_save' then
  p:=args->'payload';head:=p->'result'->'headword';
  if jsonb_typeof(p) is distinct from 'object' or p->>'version' is distinct from '1' or octet_length(p::text)>220000
   or jsonb_typeof(head) is distinct from 'object' or jsonb_typeof(head->'title') is distinct from 'string' or length(trim(head->>'title')) not between 1 and 400
   or jsonb_typeof(p->'selected') is distinct from 'array' or jsonb_array_length(p->'selected') not between 1 and 7
   or exists(select 1 from jsonb_array_elements_text(p->'selected') x where x not in ('core','summary','senses','examples','collocations','register','confusions')) then
   raise exception 'Invalid learning snapshot';
  end if;
  if exists(select 1 from jsonb_object_keys(p) x where x not in ('version','result','selected','origin'))
   or exists(select 1 from jsonb_object_keys(p->'result') x where x not in ('headword','meta','senses','collocations','register','confusions')) then raise exception 'Unknown content field';end if;
  if jsonb_typeof(p->'origin') is distinct from 'string' or length(p->>'origin')>400
   or (select count(distinct x) from jsonb_array_elements_text(p->'selected') x)<>jsonb_array_length(p->'selected') then raise exception 'Invalid content identity';end if;
  foreach group_name in array array['headword','meta','register'] loop
   row:=p->'result'->group_name;
   if jsonb_typeof(row) is distinct from 'object' then raise exception 'Invalid content metadata';end if;
   for field in select jsonb_object_keys(row) loop
    if (group_name='headword' and field not in ('title','languageTag','basicPartOfSpeech','coreMeaning','summary'))
     or (group_name='meta' and field not in ('language','entryType','direction','model','generatedAt','source'))
     or (group_name='register' and field not in ('style','tone','environment'))
     or jsonb_typeof(row->field) is distinct from 'string' or length(row->>field)>(case when group_name='meta' then 1000 else 12000 end) then raise exception 'Invalid content metadata field';end if;
   end loop;
  end loop;
  foreach k in array array['senses','collocations','confusions'] loop
   if jsonb_typeof(p->'result'->k) is distinct from 'array' or jsonb_array_length(p->'result'->k)>1000 then raise exception 'Invalid content list';end if;
   for row in select * from jsonb_array_elements(p->'result'->k) loop
    if jsonb_typeof(row) is distinct from 'object' then raise exception 'Invalid content item';end if;
    for field in select jsonb_object_keys(row) loop
     if field in ('exampleHighlights','translationHighlights') then
      terms:=row->field;
      if jsonb_typeof(terms) is distinct from 'array' or jsonb_array_length(terms)>30
       or exists(select 1 from jsonb_array_elements(terms) x where jsonb_typeof(x) is distinct from 'string' or length(x#>>'{}')>400) then raise exception 'Invalid content highlights';end if;
     elsif field not in ('partOfSpeech','shortestLabel','meaning','example','translation','phrase','note','term','difference','usage') or jsonb_typeof(row->field) is distinct from 'string' or length(row->>field)>12000 then raise exception 'Invalid content item field';end if;
    end loop;
   end loop;
  end loop;
  insert into public.anki_content_snapshots(user_id,payload,hash) values(uid,p,encode(sha256(convert_to(p::text,'UTF8')),'hex')) on conflict(user_id,hash) do nothing;
  select * into snap from public.anki_content_snapshots where user_id=uid and hash=encode(sha256(convert_to(p::text,'UTF8')),'hex');
 else raise exception 'Unsupported content action';end if;
 return (to_jsonb(snap)-'user_id')||jsonb_build_object('canonical',snap.payload::text);
end $$;
revoke all on function public.anki_learning(text,jsonb) from public,anon;
grant execute on function public.anki_learning(text,jsonb) to authenticated;

alter function public.anki_bridge(text,jsonb) rename to anki_bridge_v3;
revoke all on function public.anki_bridge_v3(text,jsonb) from public,anon,authenticated;
create function public.anki_bridge(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();device uuid;job jsonb;card jsonb;old_payload jsonb;caps jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='health' then return public.anki_bridge_v3(action,args)||jsonb_build_object('bridgeVersion','0.4.0','payloadVersions',jsonb_build_array(1,2,3,4),'learningContent',true);end if;
 if action='register' then
  job:=public.anki_bridge_v3(action,args);device:=(args->>'deviceId')::uuid;
  caps:=case when args->>'bridgeVersion'='0.4.0' and args->'payloadVersions'='[1,2,3,4]'::jsonb then jsonb_build_object('payloadVersions',args->'payloadVersions','bridgeVersion','0.4.0','template','Lexi Learning v3') else '{"payloadVersions":[1,2,3]}'::jsonb end;
  update public.anki_devices set capabilities=caps where id=device and user_id=uid;return job;
 end if;
 if action='claim' then
  select payload into old_payload from public.anki_jobs where id=(args->>'jobId')::uuid and user_id=uid;
  if old_payload->>'version'='4' and args->>'workerVersion' is distinct from '0.4.0' then raise exception 'Update connection helper before claiming v4';end if;
 end if;
 if action='submit' and args->'payload'->>'version'='4' then
  device:=(args->>'deviceId')::uuid;
  if not exists(select 1 from public.anki_devices where id=device and user_id=uid and capabilities->'payloadVersions' @> '[4]'::jsonb) then raise exception 'This device requires Bridge 0.4' using errcode='40001';end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||device::text||':'||(args->>'dedupe'),0));
  select payload into old_payload from public.anki_jobs where user_id=uid and device_id=device and dedupe=args->>'dedupe';
  if old_payload is not null and old_payload is distinct from args->'payload' then raise exception 'Immutable task differs' using errcode='40001';end if;
  if old_payload is not null then return (select to_jsonb(j)-'user_id'-'lease_token'-'lease_until' from public.anki_jobs j where user_id=uid and device_id=device and dedupe=args->>'dedupe');end if;
  for card in select * from jsonb_array_elements(args->'payload'->'cards') loop
   if coalesce(card->>'sourceKind','') not in ('entry','scene') or (card->>'sourceKind'='scene' and coalesce(card->>'sceneId','')='') then raise exception 'Invalid content source';end if;
   if not exists(select 1 from public.anki_content_snapshots where id=(card->'contentRef'->>'id')::uuid and user_id=uid and hash=card->'contentRef'->>'hash') then raise exception 'Content snapshot unavailable' using errcode='42501';end if;
  end loop;
  job:=public.anki_bridge_v3(action,jsonb_set(args,'{payload,version}','3'));
  if job->'payload' is distinct from args->'payload' and job->'payload' is distinct from jsonb_set(args->'payload','{version}','3') then raise exception 'Immutable task differs' using errcode='40001';end if;
  update public.anki_jobs set payload=args->'payload' where id=(job->>'id')::uuid and user_id=uid;
  return jsonb_set(job,'{payload}',args->'payload');
 end if;
 return public.anki_bridge_v3(action,args);
end $$;
revoke all on function public.anki_bridge(text,jsonb) from public,anon;
grant execute on function public.anki_bridge(text,jsonb) to authenticated;

create or replace function public.anki_next_job(args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();device uuid:=(args->>'deviceId')::uuid;job_id uuid;
begin
 if uid is null or not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Device unavailable' using errcode='42501';end if;
 select id into job_id from public.anki_jobs where user_id=uid and device_id=device
  and status in ('awaiting_device','awaiting_confirmation','running') and not cancel_requested
  and payload->>'confirmationMode'='web' and (lease_until is null or lease_until<=now())
  and (payload->>'version'<>'4' or args->>'workerVersion'='0.4.0') order by created_at,id limit 1;
 return case when job_id is null then 'null'::jsonb else jsonb_build_object('id',job_id) end;
end $$;
create or replace function public.anki_validate_review_changes() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare row jsonb;change jsonb;
begin
 for row in select * from jsonb_array_elements(new.snapshot->'rows') loop
  if not row ? 'changes' then continue;end if;
  if jsonb_typeof(row->'changes') is distinct from 'array' or jsonb_array_length(row->'changes')>12 then raise exception 'Invalid preview changes';end if;
  for change in select * from jsonb_array_elements(row->'changes') loop
   if jsonb_typeof(change) is distinct from 'object' or coalesce(change->>'field','') not in ('Expression','Origin','Sentence','Translation','Meaning','Notes','Source','DictionarySource','Dictionary','CoreMeaning','AIContent','AIContentSource')
    or jsonb_typeof(change->'before') is distinct from 'string' or length(change->>'before')>600
    or jsonb_typeof(change->'after') is distinct from 'string' or length(change->>'after')>600
    or jsonb_typeof(change->'beforeTruncated') is distinct from 'boolean' or jsonb_typeof(change->'afterTruncated') is distinct from 'boolean'
    or exists(select 1 from jsonb_object_keys(change) k where k not in ('field','before','after','beforeTruncated','afterTruncated')) then raise exception 'Invalid preview change field';end if;
  end loop;
 end loop;return new;
end $$;
commit;
