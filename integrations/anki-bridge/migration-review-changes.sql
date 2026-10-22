-- Additive: old previews without changes remain valid; original owner/lease checks stay in place.
begin;
create function public.anki_validate_review_changes() returns trigger
language plpgsql set search_path=pg_catalog,public as $$
declare row jsonb; change jsonb;
begin
 for row in select * from jsonb_array_elements(new.snapshot->'rows') loop
  if not row ? 'changes' then continue; end if;
  if jsonb_typeof(row->'changes') is distinct from 'array' or jsonb_array_length(row->'changes')>9 then
   raise exception 'Invalid preview changes';
  end if;
  for change in select * from jsonb_array_elements(row->'changes') loop
   if jsonb_typeof(change) is distinct from 'object'
    or coalesce(change->>'field','') not in ('Expression','Origin','Sentence','Translation','Meaning','Notes','Source','DictionarySource','Dictionary')
    or jsonb_typeof(change->'before') is distinct from 'string' or length(change->>'before')>600
    or jsonb_typeof(change->'after') is distinct from 'string' or length(change->>'after')>600
    or jsonb_typeof(change->'beforeTruncated') is distinct from 'boolean'
    or jsonb_typeof(change->'afterTruncated') is distinct from 'boolean'
    or exists(select 1 from jsonb_object_keys(change) k where k not in ('field','before','after','beforeTruncated','afterTruncated')) then
    raise exception 'Invalid preview change field';
   end if;
  end loop;
 end loop;
 return new;
end $$;
revoke all on function public.anki_validate_review_changes() from public,anon,authenticated;
create trigger anki_review_changes before insert or update of snapshot on public.anki_job_reviews
for each row execute function public.anki_validate_review_changes();
commit;
