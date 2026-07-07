-- TRIBE — auto-provisioning del profilo utente
-- Problema risolto: quando un utente si registra tramite Supabase Auth,
-- viene creata una riga in auth.users (gestita da Supabase), ma NESSUNA
-- riga corrispondente veniva creata in public.users (la nostra tabella
-- applicativa, referenziata da trips, expenses, ecc.). Questo trigger
-- automatizza la creazione del profilo ad ogni nuova registrazione.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea il profilo per gli utenti che si sono già registrati
-- prima che questo trigger esistesse.
insert into public.users (id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), email
from auth.users
on conflict (id) do nothing;
