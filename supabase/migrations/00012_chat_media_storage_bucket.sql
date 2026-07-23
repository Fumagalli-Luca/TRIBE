-- TRIBE — Storage bucket per foto in chat viaggio (spec §4.11)
-- Bucket pubblico in lettura (come avatars), scrittura solo per membri accettati
-- del viaggio a cui appartiene la cartella (path: {trip_id}/{filename}).

insert into storage.buckets (id, name, public)
values ('chat-media', 'chat-media', true)
on conflict (id) do nothing;

create policy "chat_media_public_read"
on storage.objects for select
using (bucket_id = 'chat-media');

create policy "chat_media_member_write"
on storage.objects for insert
with check (
  bucket_id = 'chat-media'
  and is_trip_member((storage.foldername(name))[1]::uuid)
);
