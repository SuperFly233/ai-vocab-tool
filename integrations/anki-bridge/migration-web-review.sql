-- Additive migration after migration.sql. Website confirmation, not local UI, authorizes new jobs.
begin;
create table public.anki_job_reviews (
 job_id uuid primary key references public.anki_jobs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 revision uuid, approved_revision uuid, lease_token uuid,
 snapshot jsonb, requested_deck text, expires_at timestamptz,
 check(snapshot is null or octet_length(snapshot::text)<=240000),
 check(requested_deck is null or length(requested_deck) between 1 and 200)
);
alter table public.anki_job_reviews enable row level security;
revoke all on public.anki_job_reviews from public,anon,authenticated;

create function public.anki_require_web_confirmation() returns trigger
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.status='running' and old.status is distinct from new.status and new.payload->>'confirmationMode'='web' then
  if not exists(select 1 from public.anki_job_reviews r where r.job_id=new.id and r.user_id=new.user_id
   and r.revision=r.approved_revision and r.revision is not null and r.snapshot is not null
   and r.lease_token=new.lease_token and r.expires_at>now()) then
   raise exception 'Website confirmation required' using errcode='42501';
  end if;
 end if;
 return new;
end $$;
revoke all on function public.anki_require_web_confirmation() from public,anon,authenticated;
create trigger anki_web_confirmation before update on public.anki_jobs
for each row execute function public.anki_require_web_confirmation();

create function public.anki_review(action text,args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare
 uid uuid:=auth.uid(); job public.anki_jobs; review public.anki_job_reviews;
 snap jsonb; row jsonb; revision uuid; keys int;
begin
 if uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if octet_length(args::text)>250000 then raise exception 'Review too large'; end if;
 select * into job from public.anki_jobs where id=(args->>'jobId')::uuid and user_id=uid for update;
 if job.id is null then raise exception 'Task unavailable' using errcode='42501'; end if;
 if action='review_publish' then
  if job.status<>'awaiting_confirmation' or job.cancel_requested or job.lease_until<=now()
   or job.lease_token is null or job.lease_token is distinct from nullif(args->>'leaseToken','')::uuid
   or job.device_id is distinct from (args->>'deviceId')::uuid then
   raise exception 'Preview lease expired' using errcode='40001';
  end if;
  snap:=args->'snapshot';
  if jsonb_typeof(snap) is distinct from 'object' or jsonb_typeof(snap->'rows') is distinct from 'array'
   or jsonb_typeof(snap->'decks') is distinct from 'array'
   or coalesce(length(snap->>'deck'),0) not between 1 and 200
   or coalesce(length(snap->>'profile'),0) not between 1 and 200
   or coalesce(snap->>'binding','') !~ '^[a-f0-9]{64}$'
   or jsonb_array_length(snap->'decks')>500 or octet_length(snap::text)>240000
   or jsonb_array_length(snap->'rows')<>jsonb_array_length(job.payload->'cards') then raise exception 'Invalid review'; end if;
  if exists(select 1 from jsonb_array_elements(snap->'decks') d where jsonb_typeof(d)<>'string' or length(d#>>'{}') not between 1 and 200)
   or not snap->'decks' ? (snap->>'deck') then raise exception 'Invalid deck list'; end if;
  select count(distinct r->>'key') into keys from jsonb_array_elements(snap->'rows') r;
  if keys<>jsonb_array_length(job.payload->'cards') then raise exception 'Duplicate review keys'; end if;
  for row in select * from jsonb_array_elements(snap->'rows') loop
   if coalesce(row->>'operation','') not in ('create','skip','update')
    or not exists(select 1 from jsonb_array_elements(job.payload->'cards') c where c->>'key'=row->>'key')
    or jsonb_typeof(row->'previous') is distinct from 'object' then raise exception 'Invalid review row'; end if;
   if exists(select 1 from jsonb_each(row->'previous') f where f.key not in ('Expression','Sentence','Translation','Meaning','Notes','Source')
     or jsonb_typeof(f.value)<>'string' or length(f.value#>>'{}')>30000) then raise exception 'Invalid previous fields'; end if;
  end loop;
  select * into review from public.anki_job_reviews where job_id=job.id;
  if review.requested_deck is not null and review.requested_deck<>snap->>'deck' then raise exception 'Target changed; prepare again' using errcode='40001'; end if;
  revision:=gen_random_uuid();
  insert into public.anki_job_reviews(job_id,user_id,revision,lease_token,snapshot,expires_at)
   values(job.id,uid,revision,job.lease_token,snap,now()+interval '10 minutes')
   on conflict(job_id) do update set revision=excluded.revision,approved_revision=null,lease_token=excluded.lease_token,
    snapshot=excluded.snapshot,requested_deck=null,expires_at=excluded.expires_at;
  return jsonb_build_object('revision',revision);
 end if;
 select * into review from public.anki_job_reviews where job_id=job.id and user_id=uid;
 if action='review_get' then
  return jsonb_build_object('revision',review.revision,'snapshot',review.snapshot,'requestedDeck',review.requested_deck,
   'approved',coalesce(review.revision=review.approved_revision,false),
   'valid',coalesce(job.status='awaiting_confirmation' and not job.cancel_requested and job.lease_until>now()
    and review.lease_token=job.lease_token and review.expires_at>now() and review.snapshot is not null,false));
 end if;
 if action='review_target' then
  if job.status<>'awaiting_confirmation' or job.cancel_requested or review.snapshot is null
   or review.revision is distinct from (args->>'revision')::uuid
   or coalesce(length(args->>'deck'),0) not between 1 and 200
   or not review.snapshot->'decks' ? (args->>'deck') then raise exception 'Target unavailable; refresh preview'; end if;
  update public.anki_job_reviews set requested_deck=args->>'deck',snapshot=null,revision=null,approved_revision=null where job_id=job.id;
  return jsonb_build_object('waiting',true);
 end if;
 if action='review_approve' then
  if job.status<>'awaiting_confirmation' or job.cancel_requested or job.lease_until<=now() or job.lease_token is null
   or review.lease_token is distinct from job.lease_token or review.expires_at<=now() or review.snapshot is null
   or review.revision is null or review.revision is distinct from nullif(args->>'revision','')::uuid then
   raise exception 'Preview changed or expired; refresh before confirming' using errcode='40001';
  end if;
  update public.anki_job_reviews r set approved_revision=r.revision where job_id=job.id;
  return jsonb_build_object('approved',true);
 end if;
 raise exception 'Unknown review action';
end $$;
revoke all on function public.anki_review(text,jsonb) from public,anon;
grant execute on function public.anki_review(text,jsonb) to authenticated;
commit;
