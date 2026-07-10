-- TRIBE — campi profilo estesi
-- Aggiunge nome/cognome separati (oltre a full_name già esistente,
-- mantenuto per compatibilità/display), città e data di nascita,
-- raccolti durante l'onboarding post-registrazione.

alter table users add column if not exists first_name text;
alter table users add column if not exists last_name text;
alter table users add column if not exists birth_date date;
alter table users add column if not exists city text;

-- Aggiorna il trigger di auto-provisioning per copiare anche
-- first_name/last_name dai metadata raccolti in fase di registrazione.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, first_name, last_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
