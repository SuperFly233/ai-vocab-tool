-- Isolated schema specification. Apply through apply_migration only after its connector is healthy.
begin;
create schema if not exists lexi_memory_private;
revoke all on schema lexi_memory_private from public,anon,authenticated;
create table lexi_memory_private.states(user_id uuid not null references auth.users(id) on delete cascade,group_id text not null,target_id text not null,revision integer not null,state jsonb not null,primary key(user_id,group_id,target_id));
create table lexi_memory_private.events(user_id uuid not null,group_id text not null,target_id text not null,event_id uuid not null,event jsonb not null,primary key(user_id,event_id),foreign key(user_id,group_id,target_id) references lexi_memory_private.states(user_id,group_id,target_id) on delete cascade);
create table lexi_memory_private.receipts(user_id uuid not null references auth.users(id) on delete cascade,request_id uuid not null,request jsonb not null,result jsonb not null,primary key(user_id,request_id));
create table lexi_memory_private.preferences(user_id uuid primary key references auth.users(id) on delete cascade,time_zone text not null);
alter table lexi_memory_private.states enable row level security;
alter table lexi_memory_private.events enable row level security;
alter table lexi_memory_private.receipts enable row level security;
alter table lexi_memory_private.preferences enable row level security;
revoke all on all tables in schema lexi_memory_private from public,anon,authenticated;
create function public.lexi_memory_service(owner_id uuid,action text,args jsonb) returns jsonb language plpgsql security definer set search_path=pg_catalog,lexi_memory_private as $$
declare current_row lexi_memory_private.states; receipt lexi_memory_private.receipts; value jsonb; next_state jsonb; event_value jsonb; expected integer; gid text; tid text; zone text;
begin
 if owner_id is null or jsonb_typeof(args) is distinct from 'object' or octet_length(args::text)>100000 then raise exception 'Invalid request' using errcode='22023';end if;
 if action='preferences' then select time_zone into zone from lexi_memory_private.preferences where user_id=owner_id;return jsonb_build_object('timeZone',zone);end if;
 if action='list' then
  if (select count(*) from lexi_memory_private.states where user_id=owner_id)>5000 or (select count(*) from lexi_memory_private.events where user_id=owner_id)>20000 then raise exception 'Export required' using errcode='54000';end if;
  return jsonb_build_object('timeZone',(select time_zone from lexi_memory_private.preferences where user_id=owner_id),'states',(select coalesce(jsonb_agg(state),'[]') from lexi_memory_private.states where user_id=owner_id),'events',(select coalesce(jsonb_agg(event),'[]') from lexi_memory_private.events where user_id=owner_id));
 elsif action='receipt' then select result into value from lexi_memory_private.receipts where user_id=owner_id and request_id=(args->>'requestId')::uuid;select * into receipt from lexi_memory_private.receipts where user_id=owner_id and request_id=(args->>'requestId')::uuid;return case when receipt.request_id is null then null else jsonb_build_object('request',receipt.request,'result',receipt.result) end;
 end if;
 gid:=args->>'groupId';tid:=args->>'targetId';if gid is null or tid is null or length(gid) not between 1 and 200 or length(tid) not between 1 and 200 then raise exception 'Invalid target' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(owner_id::text||':'||gid||':'||tid,0));
 select * into current_row from lexi_memory_private.states where user_id=owner_id and group_id=gid and target_id=tid for update;
 if action='read' then return jsonb_build_object('state',current_row.state,'events',(select coalesce(jsonb_agg(event),'[]') from lexi_memory_private.events where user_id=owner_id and group_id=gid and target_id=tid));end if;
 if action<>'commit' then raise exception 'Invalid action' using errcode='22023';end if;
 select * into receipt from lexi_memory_private.receipts where user_id=owner_id and request_id=(args->>'requestId')::uuid;
 if receipt.request_id is not null then if receipt.request<>args->'request' then raise exception 'Request conflict' using errcode='40001';end if;return receipt.result;end if;
 expected:=(args->>'expectedRevision')::integer;next_state:=args->'result'->'state';event_value:=args->'result'->'event';
 if expected is null or expected<0 or next_state is null or jsonb_typeof(next_state)<>'object' then raise exception 'Invalid commit' using errcode='22023';end if;
 if coalesce(current_row.revision,0)<>expected or current_row.state->>'lastEventId' is distinct from args->>'expectedLastEventId' then raise exception 'Version conflict' using errcode='40001';end if;
 if next_state->>'account' is distinct from owner_id::text or next_state->>'groupId' is distinct from gid or next_state->>'targetId' is distinct from tid or (next_state->>'revision')::integer is distinct from expected+1 then raise exception 'Invalid state' using errcode='22023';end if;
 insert into lexi_memory_private.preferences values(owner_id,next_state->>'timeZone') on conflict(user_id) do nothing;
 select time_zone into zone from lexi_memory_private.preferences where user_id=owner_id;
 if zone is distinct from next_state->>'timeZone' then raise exception 'Timezone conflict' using errcode='40001';end if;
 insert into lexi_memory_private.states values(owner_id,gid,tid,expected+1,next_state) on conflict(user_id,group_id,target_id) do update set revision=excluded.revision,state=excluded.state;
 if event_value is not null then
  if event_value->>'account' is distinct from owner_id::text or event_value->>'groupId' is distinct from gid or event_value->>'targetId' is distinct from tid then raise exception 'Invalid event' using errcode='22023';end if;
  insert into lexi_memory_private.events values(owner_id,gid,tid,(event_value->>'eventId')::uuid,event_value) on conflict(user_id,event_id) do update set event=excluded.event;
 end if;
 insert into lexi_memory_private.receipts values(owner_id,(args->>'requestId')::uuid,args->'request',args->'result');return args->'result';
end $$;
revoke all on function public.lexi_memory_service(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.lexi_memory_service(uuid,text,jsonb) to service_role;
commit;
