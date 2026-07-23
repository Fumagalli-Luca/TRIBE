-- Permette all'admin del viaggio di eliminarlo (le tabelle collegate hanno già on delete cascade).
create policy "trips_delete_admin" on trips for delete using (is_trip_admin(id));
