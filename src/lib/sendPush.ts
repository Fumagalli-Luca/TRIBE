import { supabase } from './supabase';

/** Notifica gli altri membri del viaggio (fire-and-forget, non blocca la UI). */
export function notifyTrip(tripId: string, title: string, body: string, data?: Record<string, unknown>) {
  supabase.functions
    .invoke('send-push', { body: { trip_id: tripId, title, body, data } })
    .catch(() => {});
}
