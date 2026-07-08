export interface TripGeneratorPayload {
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  group_size: number;
  budget_per_person: number;
  currency: string;
  vibe: string[];
}

export interface TripGeneratorActivity {
  time_slot: 'morning' | 'afternoon' | 'evening';
  title: string;
  category: string;
  duration_minutes: number;
  estimated_cost: number;
  location_hint: string;
}

export interface TripGeneratorDay {
  day_number: number;
  date: string;
  activities: TripGeneratorActivity[];
}

export interface TripGeneratorResult {
  trip_id: string;
  trip_summary: string;
  days: TripGeneratorDay[];
}

export const VIBE_OPTIONS = [
  { key: 'party', label: 'Party 🎉' },
  { key: 'relax', label: 'Relax 🌊' },
  { key: 'cultura', label: 'Cultura 🏛️' },
  { key: 'avventura', label: 'Avventura 🏔️' },
  { key: 'mix', label: 'Mix ✨' },
] as const;

export const POPULAR_DESTINATIONS = [
  'Barcellona',
  'Lisbona',
  'Amsterdam',
  'Budapest',
  'Berlino',
] as const;
