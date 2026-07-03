-- TRIBE — Row Level Security
-- Principio (spec §5.10): l'utente può leggere/scrivere solo se esiste una riga
-- in trip_members con user_id = auth.uid() e trip_id corrispondente
-- e status = 'accepted'. Azioni sensibili richiedono role = 'admin'.

alter table users enable row level security;
alter table trips enable row level security;
alter table trip_members enable row level security;
alter table expenses enable row level security;
alter table expense_splits enable row level security;
alter table votes enable row level security;
alter table vote_choices enable row level security;
alter table chat_messages enable row level security;
alter table checklist_items enable row level security;
alter table itinerary_days enable row level security;
alter table itinerary_activities enable row level security;
alter table bookings enable row level security;

-- Helper: l'utente è membro accettato del trip
create or replace function is_trip_member(p_trip_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
      and status = 'accepted'
  );
$$;

-- Helper: l'utente è admin del trip
create or replace function is_trip_admin(p_trip_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id
      and user_id = auth.uid()
      and status = 'accepted'
      and role = 'admin'
  );
$$;

-- users: ognuno vede/modifica solo il proprio profilo -----------------------
create policy "users_select_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);

-- trips ----------------------------------------------------------------------
create policy "trips_select_member" on trips for select using (is_trip_member(id));
create policy "trips_insert_creator" on trips for insert with check (auth.uid() = created_by);
create policy "trips_update_admin" on trips for update using (is_trip_admin(id));

-- trip_members -----------------------------------------------------------------
create policy "trip_members_select" on trip_members for select using (is_trip_member(trip_id));
create policy "trip_members_insert_admin_or_self" on trip_members for insert
  with check (is_trip_admin(trip_id) or user_id = auth.uid());
create policy "trip_members_update_admin" on trip_members for update using (is_trip_admin(trip_id));
create policy "trip_members_delete_admin" on trip_members for delete using (is_trip_admin(trip_id));

-- expenses / expense_splits ------------------------------------------------------
create policy "expenses_select_member" on expenses for select using (is_trip_member(trip_id));
create policy "expenses_insert_member" on expenses for insert with check (is_trip_member(trip_id));
create policy "expense_splits_select_member" on expense_splits for select
  using (exists (select 1 from expenses e where e.id = expense_id and is_trip_member(e.trip_id)));
create policy "expense_splits_insert_member" on expense_splits for insert
  with check (exists (select 1 from expenses e where e.id = expense_id and is_trip_member(e.trip_id)));

-- votes / vote_choices ------------------------------------------------------------
create policy "votes_select_member" on votes for select using (is_trip_member(trip_id));
create policy "votes_insert_member" on votes for insert with check (is_trip_member(trip_id));
create policy "votes_update_admin_or_creator" on votes for update
  using (is_trip_admin(trip_id) or created_by = auth.uid());
create policy "vote_choices_select_member" on vote_choices for select
  using (exists (select 1 from votes v where v.id = vote_id and is_trip_member(v.trip_id)));
create policy "vote_choices_insert_member" on vote_choices for insert
  with check (exists (select 1 from votes v where v.id = vote_id and is_trip_member(v.trip_id)));

-- chat_messages ------------------------------------------------------------------
create policy "chat_messages_select_member" on chat_messages for select using (is_trip_member(trip_id));
create policy "chat_messages_insert_member" on chat_messages for insert with check (is_trip_member(trip_id));

-- checklist_items ------------------------------------------------------------------
create policy "checklist_select_shared_or_own" on checklist_items for select
  using (is_trip_member(trip_id) and (scope = 'shared' or assigned_to = auth.uid()));
create policy "checklist_insert_member" on checklist_items for insert with check (is_trip_member(trip_id));
create policy "checklist_update_member" on checklist_items for update using (is_trip_member(trip_id));

-- itinerary_days / itinerary_activities ---------------------------------------------
create policy "itinerary_days_select_member" on itinerary_days for select using (is_trip_member(trip_id));
create policy "itinerary_days_insert_member" on itinerary_days for insert with check (is_trip_member(trip_id));
create policy "itinerary_activities_select_member" on itinerary_activities for select
  using (exists (select 1 from itinerary_days d where d.id = itinerary_day_id and is_trip_member(d.trip_id)));
create policy "itinerary_activities_write_member" on itinerary_activities for insert
  with check (exists (select 1 from itinerary_days d where d.id = itinerary_day_id and is_trip_member(d.trip_id)));
create policy "itinerary_activities_update_member" on itinerary_activities for update
  using (exists (select 1 from itinerary_days d where d.id = itinerary_day_id and is_trip_member(d.trip_id)));

-- bookings (V3+, RLS pronta comunque) ------------------------------------------------
create policy "bookings_select_member" on bookings for select using (is_trip_member(trip_id));
create policy "bookings_write_admin" on bookings for all using (is_trip_admin(trip_id));
