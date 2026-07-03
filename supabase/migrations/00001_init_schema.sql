-- TRIBE — schema iniziale
-- Fonte: Product Spec §5 (Database Schema)
-- Convenzioni: id uuid, timestamptz, RLS attiva su tutte le tabelle con trip_id

create extension if not exists "pgcrypto";

-- 5.1 users -----------------------------------------------------------
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  avatar_url text,
  email text unique not null,
  phone text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5.2 trips -------------------------------------------------------------
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  cover_image_url text,
  start_date date not null,
  end_date date not null,
  budget_per_person numeric(10,2),
  currency text default 'EUR',
  vibe text[],
  status text default 'draft', -- draft | planning | live | completed | archived
  created_by uuid references users(id),
  ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5.3 trip_members --------------------------------------------------------
create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member', -- admin | member
  status text default 'pending', -- pending | accepted | declined
  invited_by uuid references users(id),
  joined_at timestamptz,
  created_at timestamptz default now(),
  unique (trip_id, user_id)
);

-- 5.4 expenses / expense_splits --------------------------------------------
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  paid_by uuid references users(id),
  description text not null,
  amount numeric(10,2) not null,
  currency text default 'EUR',
  category text, -- food | transport | accommodation | activity | other
  split_type text default 'equal', -- equal | custom | percentage
  created_at timestamptz default now()
);

create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id),
  amount_owed numeric(10,2) not null,
  settled boolean default false
);

-- 5.5 votes / vote_choices --------------------------------------------------
create table votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category text, -- hotel | activity | restaurant | general
  options jsonb not null, -- [{id, name, image_url, price, meta}]
  status text default 'open', -- open | closed
  deadline timestamptz,
  winning_option_id text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table vote_choices (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid references votes(id) on delete cascade,
  user_id uuid references users(id),
  option_id text not null,
  choice text not null, -- yes | no
  created_at timestamptz default now(),
  unique (vote_id, user_id, option_id)
);

-- 5.6 chat_messages ----------------------------------------------------------
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  sender_id uuid references users(id), -- null se system message
  type text default 'text', -- text | system | image | location
  content text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- 5.7 checklist_items --------------------------------------------------------
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category text default 'other', -- documents | packing | bookings | other
  scope text default 'shared', -- shared | personal
  assigned_to uuid references users(id),
  is_done boolean default false,
  ai_suggested boolean default false,
  created_at timestamptz default now()
);

-- 5.8 itinerary ----------------------------------------------------------
create table itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  date date not null,
  unique (trip_id, day_number)
);

create table itinerary_activities (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid references itinerary_days(id) on delete cascade,
  title text not null,
  category text, -- food | culture | party | outdoor | transport
  time_slot text, -- morning | afternoon | evening
  start_time time,
  duration_minutes int,
  location_name text,
  lat numeric,
  lng numeric,
  image_url text,
  source text default 'ai', -- ai | manual | vote_result
  status text default 'suggested', -- suggested | confirmed | removed
  order_index int default 0,
  created_at timestamptz default now()
);

-- 5.9 bookings (future — V3+) ------------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  type text not null, -- flight | hotel | activity
  provider text, -- amadeus | booking | viator
  external_reference text,
  status text default 'pending', -- pending | confirmed | cancelled
  total_price numeric(10,2),
  currency text default 'EUR',
  raw_payload jsonb,
  created_at timestamptz default now()
);

-- Indici utili -----------------------------------------------------------
create index idx_trip_members_trip_id on trip_members(trip_id);
create index idx_trip_members_user_id on trip_members(user_id);
create index idx_expenses_trip_id on expenses(trip_id);
create index idx_expense_splits_expense_id on expense_splits(expense_id);
create index idx_votes_trip_id on votes(trip_id);
create index idx_chat_messages_trip_id on chat_messages(trip_id);
create index idx_checklist_items_trip_id on checklist_items(trip_id);
create index idx_itinerary_days_trip_id on itinerary_days(trip_id);
create index idx_itinerary_activities_day_id on itinerary_activities(itinerary_day_id);
