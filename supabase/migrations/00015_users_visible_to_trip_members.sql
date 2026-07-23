-- Fix: un utente vedeva SOLO la propria riga in `users` (users_select_own),
-- quindi in Gruppo/Chat/Budget il nome e la foto degli altri membri del
-- viaggio risultavano sempre vuoti ("Utente"). Aggiungiamo una policy che
-- permette di leggere nome/foto di chi condivide con te un viaggio accettato
-- (le policy SELECT multiple su Postgres sono in OR tra loro, quindi questa
-- si aggiunge a users_select_own senza sostituirla).

create policy "users_select_trip_members" on users for select
using (
  exists (
    select 1
    from trip_members tm1
    join trip_members tm2 on tm1.trip_id = tm2.trip_id
    where tm1.user_id = auth.uid()
      and tm1.status = 'accepted'
      and tm2.user_id = users.id
      and tm2.status = 'accepted'
  )
);
