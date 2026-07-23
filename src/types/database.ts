/**
 * Tipi di dominio allineati allo schema Postgres/Supabase (spec §5).
 * NOTA: questo file contiene i tipi "hand-written" essenziali per iniziare
 * a sviluppare. Una volta collegato il progetto Supabase reale, sostituire
 * (o affiancare) con i tipi generati da:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type TripStatus = 'draft' | 'planning' | 'live' | 'completed' | 'archived';
export type MemberRole = 'admin' | 'member';
export type MemberStatus = 'pending' | 'accepted' | 'declined';
export type ExpenseCategory = 'food' | 'transport' | 'accommodation' | 'activity' | 'other';
export type SplitType = 'equal' | 'custom' | 'percentage';
export type VoteStatus = 'open' | 'closed';
export type VoteChoice = 'yes' | 'no';
export type ChatMessageType = 'text' | 'system' | 'image' | 'location' | 'ai';
export type AiConversationRole = 'user' | 'assistant';
export type ChecklistScope = 'shared' | 'personal';
export type ChecklistCategory = 'documents' | 'packing' | 'bookings' | 'other';
export type ItineraryTimeSlot = 'morning' | 'afternoon' | 'evening';
export type ItinerarySource = 'ai' | 'manual' | 'vote_result';
export type ItineraryStatus = 'suggested' | 'confirmed' | 'removed';

export interface User {
  id: string;
  full_name: string;
  username: string | null;
  avatar_url: string | null;
  email: string;
  phone: string | null;
  onboarding_completed: boolean;
  push_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  cover_image_url: string | null;
  start_date: string;
  end_date: string;
  budget_per_person: number | null;
  currency: string;
  vibe: string[] | null;
  status: TripStatus;
  created_by: string;
  ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface TripMember {
  id: string;
  trip_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  invited_by: string | null;
  joined_at: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  trip_id: string;
  paid_by: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory | null;
  split_type: SplitType;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  amount_owed: number;
  settled: boolean;
}

export interface AiConversationMessage {
  id: string;
  trip_id: string;
  user_id: string;
  role: AiConversationRole;
  content: string;
  created_at: string;
}

export interface Settlement {
  id: string;
  trip_id: string;
  from_user: string;
  to_user: string;
  amount: number;
  currency: string;
  created_at: string;
}

export interface VoteOption {
  id: string;
  name: string;
  image_url?: string;
  price?: number;
  meta?: Record<string, unknown>;
}

export interface Vote {
  id: string;
  trip_id: string;
  title: string;
  category: string | null;
  options: VoteOption[];
  status: VoteStatus;
  deadline: string | null;
  winning_option_id: string | null;
  created_by: string;
  created_at: string;
}

export interface VoteChoiceRow {
  id: string;
  vote_id: string;
  user_id: string;
  option_id: string;
  choice: VoteChoice;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  trip_id: string;
  sender_id: string | null;
  type: ChatMessageType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  trip_id: string;
  title: string;
  category: ChecklistCategory;
  scope: ChecklistScope;
  assigned_to: string | null;
  is_done: boolean;
  ai_suggested: boolean;
  created_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  day_number: number;
  date: string;
}

export interface ItineraryActivity {
  id: string;
  itinerary_day_id: string;
  title: string;
  category: string | null;
  time_slot: ItineraryTimeSlot | null;
  start_time: string | null;
  duration_minutes: number | null;
  location_name: string | null;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  source: ItinerarySource;
  status: ItineraryStatus;
  order_index: number;
  created_at: string;
}

/**
 * Placeholder minimale per il generic type param di createClient<Database>.
 * Da sostituire con i tipi generati da Supabase CLI quando il progetto è collegato.
 */
export type Database = Record<string, unknown>;
