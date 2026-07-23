-- Permette a un membro di rimuovere se stesso (leave trip), oltre alla rimozione da parte di un admin.
drop policy if exists "trip_members_delete_admin" on trip_members;
create policy "trip_members_delete_admin_or_self" on trip_members for delete
  using (is_trip_admin(trip_id) or user_id = auth.uid());
