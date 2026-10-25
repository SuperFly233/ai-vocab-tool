-- Additive compatibility shim. Only explicitly verified workers may handle v4.
begin;
alter function public.anki_bridge(text,jsonb) rename to anki_bridge_v4;
revoke all on function public.anki_bridge_v4(text,jsonb) from public,anon,authenticated;
create function public.anki_bridge(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid();result jsonb;original_args jsonb:=args;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if action='register' and args->>'bridgeVersion'='0.4.1' then
  args:=jsonb_set(args,'{bridgeVersion}','"0.4.0"');
 elsif action='claim' and args->>'workerVersion'='0.4.1' then
  args:=jsonb_set(args,'{workerVersion}','"0.4.0"');
 end if;
 result:=public.anki_bridge_v4(action,args);
 if action='register' and original_args->>'bridgeVersion'='0.4.1' and original_args->'payloadVersions'='[1,2,3,4]'::jsonb then
  update public.anki_devices set capabilities=jsonb_set(capabilities,'{bridgeVersion}','"0.4.1"')
   where id=(original_args->>'deviceId')::uuid and user_id=uid;
 end if;
 if action='health' then
  result:=result||jsonb_build_object('supportedBridgeVersions',jsonb_build_array('0.4.0','0.4.1'));
 end if;
 return result;
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
  and (payload->>'version'<>'4' or args->>'workerVersion' in ('0.4.0','0.4.1')) order by created_at,id limit 1;
 return case when job_id is null then 'null'::jsonb else jsonb_build_object('id',job_id) end;
end $$;
revoke all on function public.anki_next_job(jsonb) from public,anon;
grant execute on function public.anki_next_job(jsonb) to authenticated;
commit;
