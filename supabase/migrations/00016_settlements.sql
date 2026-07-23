-- Pareggio saldi tra membri (Budget): registra un pagamento diretto tra due
-- persone del gruppo, così i "saldi semplificati" possono essere segnati
-- come saldati invece di restare per sempre debiti teorici.

create table settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  from_user uuid references users(id) on delete cascade,
  to_user uuid references users(id) on delete cascade,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'EUR',
  created_at timestamptz not null default now()
);

alter table settlements enable row level security;

create policy "settlements_select_member" on settlements for select
  using (is_trip_member(trip_id));

create policy "settlements_insert_member" on settlements for insert
  with check (is_trip_member(trip_id) and (from_user = auth.uid() or is_trip_admin(trip_id)));
