-- Conversazione privata utente <-> assistente AI del viaggio (tab "Assistente").
-- A differenza della chat di gruppo, qui ogni utente vede solo le proprie righe.

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index idx_ai_conversations_trip_user on ai_conversations(trip_id, user_id);

alter table ai_conversations enable row level security;

create policy "ai_conversations_select_own" on ai_conversations for select
  using (user_id = auth.uid());

create policy "ai_conversations_insert_own" on ai_conversations for insert
  with check (user_id = auth.uid() and is_trip_member(trip_id));
