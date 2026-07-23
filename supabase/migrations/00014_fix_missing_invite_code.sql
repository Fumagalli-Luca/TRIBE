-- Fix: la migration 00007 era segnata come "applicata" nella tracking table
-- (per via del migration repair fatto in una sessione precedente) ma il suo
-- SQL non era mai stato eseguito davvero sul DB live: mancavano la colonna
-- invite_code, il trigger e la funzione find_trip_by_invite_code. Questa
-- migration è identica a 00007 e idempotente, per sistemare l'ambiente reale.

alter table trips add column if not exists invite_code text unique;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.set_trip_invite_code()
returns trigger
language plpgsql
as $$
declare
  code text;
  attempts int := 0;
begin
  if new.invite_code is not null then
    return new;
  end if;
  loop
    code := public.generate_invite_code();
    exit when not exists (select 1 from trips where invite_code = code);
    attempts := attempts + 1;
    exit when attempts > 10;
  end loop;
  new.invite_code := code;
  return new;
end;
$$;

drop trigger if exists on_trip_insert_invite_code on trips;
create trigger on_trip_insert_invite_code
  before insert on trips
  for each row execute function public.set_trip_invite_code();

create or replace function public.find_trip_by_invite_code(p_code text)
returns table (id uuid, name text, destination text)
language sql
security definer
stable
as $$
  select id, name, destination from trips where invite_code = upper(p_code);
$$;

do $$
declare
  r record;
  code text;
begin
  for r in select id from trips where invite_code is null loop
    loop
      code := public.generate_invite_code();
      exit when not exists (select 1 from trips where invite_code = code);
    end loop;
    update trips set invite_code = code where id = r.id;
  end loop;
end $$;
