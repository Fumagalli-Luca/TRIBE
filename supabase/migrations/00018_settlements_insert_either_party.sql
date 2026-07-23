-- Fix: "Segna come saldato" falliva in silenzio quando a premerlo era il
-- creditore (chi deve ricevere i soldi) invece del debitore: la policy
-- permetteva l'insert solo a from_user o admin. Ora basta essere una delle
-- due parti coinvolte nella transazione (o admin).

drop policy if exists "settlements_insert_member" on settlements;

create policy "settlements_insert_member" on settlements for insert
  with check (
    is_trip_member(trip_id)
    and (from_user = auth.uid() or to_user = auth.uid() or is_trip_admin(trip_id))
  );
