-- TRIBE — codice invito per unirsi a un viaggio
-- Un codice breve leggibile (es. AB13CD) al posto di un link, per
-- evitare completamente il problema del deep linking in Expo Go:
-- l'utente lo inserisce a mano nell'app per unirsi al gruppo.

alter table trips add column if not exists invite_code text unique;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- niente 0/O/1/I ambigui
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
    exit when attempts > 10; -- fallback di sicurezza, praticamente mai raggiunto
  end loop;
  new.invite_code := code;
  return new;
end;
$$;

drop trigger if exists on_trip_insert_invite_code on trips;
create trigger on_trip_insert_invite_code
  before insert on trips
  for each row execute function public.set_trip_invite_code();

-- Policy: chiunque sia autenticato può leggere SOLO id/invite_code di un
-- trip (per validare un codice prima di essere membro) - non i suoi dati.
-- Implementata come funzione invece di rilassare la policy trips_select,
-- per non esporre gli altri dati del viaggio a chi non è ancora membro.
create or replace function public.find_trip_by_invite_code(p_code text)
returns table (id uuid, name text, destination text)
language sql
security definer
stable
as $$
  select id, name, destination from trips where invite_code = upper(p_code);
$$;
