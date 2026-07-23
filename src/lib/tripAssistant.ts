import { supabase } from './supabase';

export async function askTripAssistant(tripId: string, question: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('trip-assistant', {
    body: { trip_id: tripId, question },
  });
  if (error) throw error;
  return (data as { answer: string }).answer;
}
