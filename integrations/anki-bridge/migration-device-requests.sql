-- Additive, owner-isolated device commands. No arbitrary commands, paths or note IDs.
begin;
create table public.anki_device_requests (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 device_id uuid not null references public.anki_devices(id),
 kind text not null check(kind in ('diagnostics','fushi_read','undo','open_note')),
 payload jsonb not null,status text not null default 'waiting' check(status in ('waiting','working','complete','error')),
 result jsonb,error text,lease_token uuid,lease_until timestamptz,attempts int not null default 0,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(octet_length(payload::text)<=10000),check(result is null or octet_length(result::text)<=240000),check(error is null or length(error)<=500)
);
create index anki_device_requests_pending on public.anki_device_requests(device_id,created_at) where status in ('waiting','working');
alter table public.anki_device_requests enable row level security;
revoke all on public.anki_device_requests from public,anon,authenticated;

create function public.anki_device_command(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid(); device uuid; req public.anki_device_requests; job public.anki_jobs;
 review public.anki_job_reviews; payload jsonb; result_value jsonb; item jsonb; kind text; note text;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if octet_length(args::text)>250000 then raise exception 'Command too large'; end if;
 if action='device_request' then
  device:=(args->>'deviceId')::uuid;kind:=args->>'kind';
  if not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Device unavailable' using errcode='42501'; end if;
  if kind='diagnostics' then payload:='{}';
  elsif kind='fushi_read' then
   if args->>'confirmed' is distinct from 'true' or coalesce(args->>'scope','') not in ('favorites','pending','staged')
    or coalesce(args->>'limit','') !~ '^[0-9]{1,2}$' then raise exception 'Confirm bounded Fushi source selection'; end if;
   if (args->>'limit')::int not between 1 and 20 then raise exception 'Select 1-20 Fushi sources'; end if;
   payload:=jsonb_build_object('scope',args->>'scope','limit',(args->>'limit')::int);
  elsif kind in ('undo','open_note') then
   select * into job from public.anki_jobs where id=(args->>'jobId')::uuid and user_id=uid and device_id=device for update;
   if job.id is null or job.status in ('awaiting_device','awaiting_confirmation','running') then raise exception 'Completed batch unavailable'; end if;
   select * into review from public.anki_job_reviews where job_id=job.id and user_id=uid;
   if review.snapshot is null then raise exception 'Original target snapshot unavailable'; end if;
   payload:=jsonb_build_object('jobId',job.id,'target',review.snapshot-'rows'-'decks');
   if kind='undo' and args->>'confirmed' is distinct from 'true' then raise exception 'Undo confirmation required'; end if;
   if kind='open_note' then
    select note_id into note from public.anki_job_results where job_id=job.id and user_id=uid and card_key=args->>'cardKey' and status in ('complete','skipped');
    if note is null or note !~ '^[0-9]{1,20}$' then raise exception 'Note receipt unavailable'; end if;
    payload:=payload||jsonb_build_object('cardKey',args->>'cardKey','noteId',note);
   end if;
  else raise exception 'Unsupported device command'; end if;
  if (select count(*) from public.anki_device_requests where user_id=uid and device_id=device and status in ('waiting','working'))>=20 then raise exception 'Too many pending device requests'; end if;
  insert into public.anki_device_requests(user_id,device_id,kind,payload) values(uid,device,kind,payload) returning * into req;
  return to_jsonb(req)-'user_id'-'lease_token'-'lease_until';
 end if;
 if action='device_poll' then
  device:=(args->>'deviceId')::uuid;
  if not exists(select 1 from public.anki_devices where id=device and user_id=uid) then raise exception 'Device unavailable' using errcode='42501'; end if;
  select * into req from public.anki_device_requests where user_id=uid and device_id=device
   and (status='waiting' or (status='working' and lease_until<=now())) order by created_at for update skip locked limit 1;
  if req.id is null then return 'null'::jsonb; end if;
  if req.attempts>=5 then
   update public.anki_device_requests set status='error',error='Device repeatedly disconnected; request again',updated_at=now() where id=req.id;
   return 'null'::jsonb;
  end if;
  update public.anki_device_requests set status='working',lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds',attempts=attempts+1,updated_at=now() where id=req.id returning * into req;
  return to_jsonb(req)-'user_id';
 end if;
 select * into req from public.anki_device_requests where id=(args->>'requestId')::uuid and user_id=uid for update;
 if req.id is null then raise exception 'Request unavailable' using errcode='42501'; end if;
 if action='device_status' then return to_jsonb(req)-'user_id'-'lease_token'-'lease_until'; end if;
 if req.device_id is distinct from (args->>'deviceId')::uuid or req.status<>'working' or req.lease_token is null
  or req.lease_token is distinct from nullif(args->>'leaseToken','')::uuid or req.lease_until<=now() then
  raise exception 'Device request lease expired' using errcode='40001';
 end if;
 if action='device_heartbeat' then
  update public.anki_device_requests set lease_until=now()+interval '90 seconds' where id=req.id;
  return jsonb_build_object('active',true);
 end if;
 if action='device_result' then
  if args->>'error' is not null then
   update public.anki_device_requests set status='error',error=left(args->>'error',500),lease_token=null,lease_until=null,updated_at=now() where id=req.id;
   return jsonb_build_object('saved',true);
  end if;
  result_value:=args->'result';
  if jsonb_typeof(result_value) is distinct from 'object' or octet_length(result_value::text)>240000 then raise exception 'Invalid device result'; end if;
  if req.kind='fushi_read' then
   if jsonb_typeof(result_value->'items') is distinct from 'array' then raise exception 'Invalid Fushi sources'; end if;
   if jsonb_array_length(result_value->'items')>(req.payload->>'limit')::int then raise exception 'Too many Fushi sources'; end if;
   for item in select * from jsonb_array_elements(result_value->'items') loop
    if jsonb_typeof(item) is distinct from 'object' or coalesce(length(item->>'id'),0) not between 1 and 160
     or coalesce(item->>'key','') !~ '^[a-f0-9]{64}$' then raise exception 'Invalid Fushi source identity'; end if;
    if exists(select 1 from jsonb_each(item) f where f.key not in ('id','key','title','quote','sourceTitle','chapter','createdAt','queued','status','sourceType','mediaAvailable')) then raise exception 'Unexpected Fushi fields'; end if;
    if exists(select 1 from jsonb_each(item) f where (f.key in ('id','key','title','quote','sourceTitle','chapter','status','sourceType') and jsonb_typeof(f.value)<>'string')
     or (f.key in ('queued','mediaAvailable') and jsonb_typeof(f.value)<>'boolean')) then raise exception 'Invalid Fushi field types'; end if;
    if coalesce(length(item->>'title'),0)>400 or coalesce(length(item->>'quote'),0)>4000
     or coalesce(length(item->>'sourceTitle'),0)>400 or coalesce(length(item->>'chapter'),0)>400 then raise exception 'Fushi source too large'; end if;
   end loop;
   result_value:=jsonb_build_object('items',result_value->'items');
  end if;
  update public.anki_device_requests set status='complete',result=result_value,error=null,lease_token=null,lease_until=null,updated_at=now() where id=req.id;
  return jsonb_build_object('saved',true);
 end if;
 raise exception 'Unknown device action';
end $$;
revoke all on function public.anki_device_command(text,jsonb) from public,anon;
grant execute on function public.anki_device_command(text,jsonb) to authenticated;
commit;
