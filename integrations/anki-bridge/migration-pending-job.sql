begin;
create index anki_jobs_pending_device on public.anki_jobs(user_id,device_id,created_at)
 where status in ('awaiting_device','awaiting_confirmation','running') and not cancel_requested;
create function public.anki_next_job(args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); device uuid:=(args->>'deviceId')::uuid; job_id uuid;
begin
 if uid is null or not exists(select 1 from public.anki_devices where id=device and user_id=uid) then
  raise exception 'Device unavailable' using errcode='42501';
 end if;
 select id into job_id from public.anki_jobs where user_id=uid and device_id=device
  and status in ('awaiting_device','awaiting_confirmation','running') and not cancel_requested
  and payload->>'confirmationMode'='web' and (lease_until is null or lease_until<=now())
  order by created_at,id limit 1;
 return case when job_id is null then 'null'::jsonb else jsonb_build_object('id',job_id) end;
end $$;
revoke all on function public.anki_next_job(jsonb) from public,anon;
grant execute on function public.anki_next_job(jsonb) to authenticated;
commit;
