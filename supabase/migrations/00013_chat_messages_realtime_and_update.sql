-- Fix: i messaggi chat non comparivano in tempo reale (la tabella non era
-- mai stata aggiunta alla publication realtime) e le reazioni non si
-- salvavano (mancava una policy di update).

alter publication supabase_realtime add table chat_messages;

create policy "chat_messages_update_member" on chat_messages for update
  using (is_trip_member(trip_id));
