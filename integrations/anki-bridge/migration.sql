-- Apply once in the project's Supabase SQL editor. Does not modify study_store.
begin;
create table if not exists public.anki_devices (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(name) between 1 and 80),
 last_seen timestamptz not null default now(), created_at timestamptz not null default now()
);
create table if not exists public.anki_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid not null references public.anki_devices(id), dedupe text not null,
 payload jsonb not null, status text not null default 'awaiting_device'
 check(status in ('awaiting_device','awaiting_confirmation','running','partial','complete','error','cancelled')),
 cancel_requested boolean not null default false, lease_token uuid, lease_until timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(user_id,device_id,dedupe), check(octet_length(payload::text)<=262144)
);
create table if not exists public.anki_job_results (
 job_id uuid not null references public.anki_jobs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 card_key text not null, status text not null check(status in ('complete','skipped','error','undone')),
 note_id text, message text not null default '', updated_at timestamptz not null default now(),
 primary key(job_id,card_key), check(length(card_key)<=160 and length(message)<=500)
);
create index if not exists anki_jobs_owner_updated on public.anki_jobs(user_id,updated_at desc);
alter table public.anki_devices enable row level security;
alter table public.anki_jobs enable row level security;
alter table public.anki_job_results enable row level security;
drop policy if exists anki_devices_read_own on public.anki_devices;
create policy anki_devices_read_own on public.anki_devices for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists anki_jobs_read_own on public.anki_jobs;
create policy anki_jobs_read_own on public.anki_jobs for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists anki_results_read_own on public.anki_job_results;
create policy anki_results_read_own on public.anki_job_results for select to authenticated using(user_id=(select auth.uid()));
revoke all on public.anki_devices,public.anki_jobs,public.anki_job_results from anon,authenticated;
grant select on public.anki_devices,public.anki_jobs,public.anki_job_results to authenticated;

create or replace function public.anki_bridge(action text,args jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid(); job public.anki_jobs; device uuid; card jsonb;
 total int; done_count int; error_count int; key_count int; token uuid;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if octet_length(args::text)>280000 then raise exception 'Payload too large'; end if;
 if action='health' then return jsonb_build_object('schema',1,'bridgeVersion','0.2.0','payloadVersions',jsonb_build_array(1,2)); end if;
 if action='register' then
  device:=(args->>'deviceId')::uuid;
  if length(trim(args->>'name')) not between 1 and 80 then raise exception 'Invalid device name'; end if;
  insert into public.anki_devices(id,user_id,name) values(device,uid,trim(args->>'name'))
   on conflict(id) do update set name=excluded.name,last_seen=now() where anki_devices.user_id=uid;
  if not found then raise exception 'Device unavailable' using errcode='42501'; end if;
  return jsonb_build_object('deviceId',device);
 end if;
 if action='devices' then return coalesce((select jsonb_agg(to_jsonb(d) - 'user_id' order by last_seen desc) from public.anki_devices d where user_id=uid),'[]'); end if;
 if action='list' then
  return coalesce((select jsonb_agg(to_jsonb(j) - 'user_id' - 'lease_token' - 'lease_until' order by j.created_at desc) from
   (select * from public.anki_jobs where user_id=uid order by created_at desc limit 100) j),'[]');
 end if;
 if action='results' then return coalesce((select jsonb_agg(to_jsonb(r)-'user_id') from public.anki_job_results r where user_id=uid and job_id=(args->>'jobId')::uuid),'[]'); end if;
 if action='submit' then
  device:=(args->>'deviceId')::uuid;
  if not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Device unavailable' using errcode='42501'; end if;
  if jsonb_typeof(args->'payload'->'cards') is distinct from 'array' then raise exception 'Invalid cards'; end if;
  if coalesce((args->'payload'->>'version') in ('1','2'),false)=false then raise exception 'Unsupported payload version'; end if;
  total:=jsonb_array_length(args->'payload'->'cards');
  if total not between 1 and 20 or octet_length((args->'payload')::text)>262144 or length(args->>'dedupe')<>64 then raise exception 'Invalid batch'; end if;
  select count(distinct c->>'key') into key_count from jsonb_array_elements(args->'payload'->'cards') c;
  if key_count<>total then raise exception 'Duplicate card keys'; end if;
  for card in select * from jsonb_array_elements(args->'payload'->'cards') loop
   if jsonb_typeof(card) is distinct from 'object' or jsonb_typeof(card->'media') is distinct from 'array' then raise exception 'Invalid card structure'; end if;
   if args->'payload'->>'version'='2' and (coalesce(card->>'sourceType','') not in ('lexi','fushi') or coalesce(length(card->>'sourceId'),0) not between 1 and 160) then raise exception 'Invalid source identity'; end if;
   if coalesce(length(card->>'key'),0) not between 1 and 160 or coalesce(length(card->>'title'),0) not between 1 and 400
    or coalesce(length(card->>'quote'),0)>4000 or coalesce(length(card->>'translation'),0)>4000 or coalesce(length(card->>'meaning'),0)>12000
    or coalesce(length(card->>'note'),0)>12000 then raise exception 'Invalid card'; end if;
   if jsonb_array_length(card->'media')>10 then raise exception 'Too many media'; end if;
   if exists(select 1 from jsonb_array_elements(card->'media') m where jsonb_typeof(m) is distinct from 'object'
     or coalesce(m->>'id','') !~ '^[a-f0-9]{64}$'
     or coalesce(m->>'mime','') not in ('image/png','image/jpeg','image/gif','image/webp','video/mp4','video/webm','audio/mpeg','audio/ogg','audio/wav')
     or jsonb_typeof(m->'size') is distinct from 'number' or coalesce(m->>'size','') !~ '^[0-9]+$') then raise exception 'Invalid media'; end if;
   if exists(select 1 from jsonb_array_elements(card->'media') m where (m->>'size')::numeric not between 1 and 20971520) then raise exception 'Media too large'; end if;
  end loop;
  if (select coalesce(sum(size),0) from (select max((m->>'size')::numeric) size from jsonb_array_elements(args->'payload'->'cards') c cross join lateral jsonb_array_elements(c->'media') m group by m->>'id') refs)>52428800 then raise exception 'Batch media too large'; end if;
  insert into public.anki_jobs(user_id,device_id,dedupe,payload) values(uid,device,args->>'dedupe',args->'payload')
   on conflict(user_id,device_id,dedupe) do nothing returning * into job;
  if job.id is null then select * into job from public.anki_jobs where user_id=uid and device_id=device and dedupe=args->>'dedupe'; end if;
  return to_jsonb(job)-'user_id'-'lease_token'-'lease_until';
 end if;
 select * into job from public.anki_jobs where id=(args->>'jobId')::uuid and user_id=uid for update;
 if job.id is null then raise exception 'Task unavailable' using errcode='42501'; end if;
 if action='cancel' then
  if job.status in ('complete','cancelled') then return jsonb_build_object('status',job.status); end if;
  update public.anki_jobs set cancel_requested=true,status=case when status='running' then status else 'cancelled' end,updated_at=now() where id=job.id;
  return jsonb_build_object('cancelRequested',true);
 end if;
 if action='retry' then
  if job.status not in ('error','partial','cancelled') then raise exception 'Task cannot be retried'; end if;
  update public.anki_jobs set status='awaiting_device',cancel_requested=false,lease_token=null,lease_until=null,updated_at=now() where id=job.id;
  return jsonb_build_object('status','awaiting_device');
 end if;
 device:=(args->>'deviceId')::uuid;
 if job.device_id is distinct from device or not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Wrong device' using errcode='42501'; end if;
 if action='undo' then
  if job.status in ('running','awaiting_confirmation') then raise exception 'Task is active'; end if;
  update public.anki_job_results set status='undone',updated_at=now() where job_id=job.id and card_key=args->>'cardKey' and user_id=uid;
  if not found then raise exception 'Unknown receipt'; end if;
  update public.anki_jobs set status=case when exists(select 1 from public.anki_job_results where job_id=job.id and status in ('complete','skipped')) then 'partial' else 'cancelled' end,updated_at=now() where id=job.id;
  return jsonb_build_object('saved',true);
 end if;
 if action='claim' then
  if job.status in ('complete','cancelled') or job.cancel_requested then raise exception 'Task is closed'; end if;
  if job.lease_until>now() and job.lease_token is distinct from nullif(args->>'leaseToken','')::uuid then raise exception 'Task already leased' using errcode='40001'; end if;
  token:=gen_random_uuid();
  update public.anki_jobs set lease_token=token,lease_until=now()+interval '90 seconds',status='awaiting_confirmation',updated_at=now() where id=job.id returning * into job;
  update public.anki_devices set last_seen=now() where id=device;
  return to_jsonb(job)-'user_id';
 end if;
 if job.lease_token is distinct from nullif(args->>'leaseToken','')::uuid or job.lease_until is null or job.lease_until<=now() or job.lease_token is null then raise exception 'Lease expired' using errcode='40001'; end if;
 if action='heartbeat' then
  update public.anki_jobs set lease_until=now()+interval '90 seconds' where id=job.id;
  return jsonb_build_object('cancelRequested',job.cancel_requested);
 end if;
 if action='start' then
  if job.cancel_requested or job.status<>'awaiting_confirmation' then raise exception 'Confirmation expired'; end if;
  update public.anki_jobs set status='running',updated_at=now() where id=job.id;
  return jsonb_build_object('status','running');
 end if;
 if action='ack' then
  if job.status<>'running' then raise exception 'Task is not running'; end if;
  if not exists(select 1 from jsonb_array_elements(job.payload->'cards') c where c->>'key'=args->>'cardKey') then raise exception 'Unknown card'; end if;
  if args->>'status' not in ('complete','skipped','error','undone') then raise exception 'Invalid result'; end if;
  insert into public.anki_job_results(job_id,user_id,card_key,status,note_id,message)
   values(job.id,uid,args->>'cardKey',args->>'status',left(args->>'noteId',30),left(coalesce(args->>'message',''),500))
   on conflict(job_id,card_key) do update set status=excluded.status,note_id=excluded.note_id,message=excluded.message,updated_at=now();
  return jsonb_build_object('saved',true);
 end if;
 if action='finish' then
  if job.status<>'running' then raise exception 'Task is not running'; end if;
  total:=jsonb_array_length(job.payload->'cards');
  select count(*) filter(where status in ('complete','skipped')),count(*) filter(where status='error') into done_count,error_count from public.anki_job_results where job_id=job.id;
  update public.anki_jobs set status=case when cancel_requested then 'cancelled' when done_count=total then 'complete' when done_count>0 then 'partial' else 'error' end,lease_token=null,lease_until=null,updated_at=now() where id=job.id returning * into job;
  return jsonb_build_object('status',job.status,'completed',done_count,'failed',error_count);
 end if;
 raise exception 'Unknown action';
end $$;
revoke all on function public.anki_bridge(text,jsonb) from public,anon;
grant execute on function public.anki_bridge(text,jsonb) to authenticated;
commit;
