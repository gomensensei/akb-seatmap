begin;

-- Tool48 Seatmap cloud-save hard limit.
-- Safe to run more than once in Supabase SQL Editor.
-- Keeps existing rows untouched, but blocks new rows after each user reaches 200.

create or replace function public.tool48_enforce_seat_memo_record_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.user_id is null then
    raise exception 'tool48_seatmap_cloud_record_user_missing';
  end if;

  if pg_column_size(new.payload) > 131072 then
    raise exception 'tool48_seatmap_payload_too_large';
  end if;

  if tg_op = 'INSERT' and (
    select count(*)
    from public.seat_memo_records
    where user_id = new.user_id
      and created_at >= now() - interval '24 hours'
  ) >= 10 then
    raise exception 'tool48_seatmap_daily_insert_limit_reached';
  end if;

  if tg_op = 'INSERT' and (
    select count(*)
    from public.seat_memo_records
    where user_id = new.user_id
  ) >= 200 then
    raise exception 'tool48_seatmap_cloud_record_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists tool48_seat_memo_record_limit_before_insert on public.seat_memo_records;
drop trigger if exists tool48_seat_memo_record_limit_before_write on public.seat_memo_records;
create trigger tool48_seat_memo_record_limit_before_write
before insert or update on public.seat_memo_records
for each row execute function public.tool48_enforce_seat_memo_record_limit();

create or replace view public.seat_memo_public_lottery as
select
  id,
  event_date,
  performance_title,
  created_at,
  jsonb_build_object(
    'version', case when payload->>'version' ~ '^[0-9]+$' then (payload->>'version')::int else 1 end,
    'type', 'lottery-entry',
    'source', 'anonymous-public',
    'savedAt', payload->>'savedAt',
    'eventDate', payload->>'eventDate',
    'performance', jsonb_build_object(
      'id', coalesce(payload #>> '{performance,id}', ''),
      'label', coalesce(payload #>> '{performance,label}', '')
    ),
    'entries', coalesce((
      select jsonb_agg(jsonb_build_object(
        'range', entry->>'range',
        'order', case when entry->>'order' ~ '^[0-9]+$' then (entry->>'order')::int else null end
      ))
      from jsonb_array_elements(coalesce(payload->'entries', '[]'::jsonb)) as entry
      where coalesce(entry->>'range', '') <> ''
    ), '[]'::jsonb)
  ) as public_payload
from public.seat_memo_records
where public_consent is true
  and public_status in ('pending', 'approved')
  and payload->>'type' = 'lottery-entry';

grant select on public.seat_memo_public_lottery to anon, authenticated;

notify pgrst, 'reload schema';

commit;
