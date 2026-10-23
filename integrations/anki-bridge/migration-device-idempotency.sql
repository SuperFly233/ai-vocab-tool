-- Optional request identity; legacy callers remain compatible.
begin;
alter table public.anki_device_requests add column client_request_id uuid;
alter table public.anki_device_requests add column request_fingerprint jsonb;
create unique index anki_device_request_identity on public.anki_device_requests(user_id,device_id,client_request_id)
 where client_request_id is not null;
alter function public.anki_device_command(text,jsonb) rename to anki_device_command_v3;
revoke all on function public.anki_device_command_v3(text,jsonb) from public,anon,authenticated;
create function public.anki_device_command(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare uid uuid:=auth.uid(); device uuid; identity uuid; fingerprint jsonb; req public.anki_device_requests; value jsonb;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if octet_length(args::text)>250000 then raise exception 'Command too large';end if;
 if action='device_request' and args ? 'clientRequestId' then
  identity:=(args->>'clientRequestId')::uuid;device:=(args->>'deviceId')::uuid;
  if identity is null or not exists(select 1 from public.anki_devices where id=device and user_id=uid) then
   raise exception 'Device unavailable' using errcode='42501';
  end if;
  fingerprint:=args-'clientRequestId';
  perform pg_advisory_xact_lock(hashtextextended(uid::text||':'||device::text,0));
  select * into req from public.anki_device_requests where user_id=uid and device_id=device and client_request_id=identity;
  if req.id is not null then
   if req.request_fingerprint is distinct from fingerprint then
    raise exception 'Request identity already belongs to different parameters' using errcode='40001';
   end if;
   return to_jsonb(req)-'user_id'-'lease_token'-'lease_until'-'request_fingerprint';
  end if;
  value:=public.anki_device_command_v3(action,args-'clientRequestId');
  update public.anki_device_requests set client_request_id=identity,request_fingerprint=fingerprint
   where id=(value->>'id')::uuid and user_id=uid returning * into req;
  return to_jsonb(req)-'user_id'-'lease_token'-'lease_until'-'request_fingerprint';
 end if;
 value:=public.anki_device_command_v3(action,args);
 if jsonb_typeof(value)='object' then return value-'request_fingerprint';end if;
 return value;
end $$;
revoke all on function public.anki_device_command(text,jsonb) from public,anon;
grant execute on function public.anki_device_command(text,jsonb) to authenticated;
commit;
