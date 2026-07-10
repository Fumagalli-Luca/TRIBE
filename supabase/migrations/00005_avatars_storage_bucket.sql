-- TRIBE — Storage bucket per foto profilo
-- Bucket pubblico in lettura (le foto profilo sono visibili al gruppo),
-- ma ogni utente può scrivere solo dentro la propria cartella
-- (path convenzionale: {user_id}/avatar.jpg)

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_public_read"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "avatar_owner_write"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar_owner_update"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "avatar_owner_delete"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
