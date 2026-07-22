// Edge Function: generate-trip
// Riferimento spec: §6.3 (Data flow) + §7.1 (Trip Generator AI)
//
// Env richieste:
// - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY -> fornite
//   automaticamente da Supabase
// - OPENAI_API_KEY -> da impostare manualmente:
//     supabase secrets set OPENAI_API_KEY=sk-...
//   oppure da Dashboard -> Edge Functions -> Secrets
// - MOCK_AI -> se impostata a "true", NON chiama OpenAI (zero costi):
//   genera un itinerario finto ma strutturalmente valido, utile per
//   sviluppare/testare il resto dell'app senza spendere token.
//     supabase secrets set MOCK_AI=true   (sviluppo, gratis)
//     supabase secrets set MOCK_AI=false  (quando si vuole l'AI vera)

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_MODEL = 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TripGeneratorInput {
  destination: string;
  start_date: string;
  end_date: string;
  group_size: number;
  budget_per_person: number;
  currency: string;
  vibe: string[];
}

interface TripGeneratorActivity {
  time_slot: 'morning' | 'afternoon' | 'evening';
  title: string;
  category: string;
  duration_minutes: number;
  estimated_cost: number;
  location_hint: string;
}

interface TripGeneratorDay {
  day_number: number;
  date: string;
  activities: TripGeneratorActivity[];
}

interface TripGeneratorOutput {
  trip_summary: string;
  days: TripGeneratorDay[];
}

function validateInput(body: unknown): body is TripGeneratorInput {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.destination === 'string' &&
    b.destination.trim().length > 0 &&
    typeof b.start_date === 'string' &&
    typeof b.end_date === 'string' &&
    typeof b.group_size === 'number' &&
    b.group_size > 0 &&
    typeof b.budget_per_person === 'number' &&
    b.budget_per_person > 0 &&
    typeof b.currency === 'string' &&
    Array.isArray(b.vibe)
  );
}

function validateOutput(output: unknown): output is TripGeneratorOutput {
  if (!output || typeof output !== 'object') return false;
  const o = output as Record<string, unknown>;
  if (typeof o.trip_summary !== 'string' || !Array.isArray(o.days)) return false;
  return o.days.every((day: unknown) => {
    if (!day || typeof day !== 'object') return false;
    const d = day as Record<string, unknown>;
    return (
      typeof d.day_number === 'number' &&
      typeof d.date === 'string' &&
      Array.isArray(d.activities) &&
      d.activities.every((a: unknown) => {
        if (!a || typeof a !== 'object') return false;
        const act = a as Record<string, unknown>;
        return typeof act.title === 'string' && typeof act.time_slot === 'string';
      })
    );
  });
}

function daysBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function generateMockTrip(input: TripGeneratorInput): TripGeneratorOutput {
  const dates = daysBetween(input.start_date, input.end_date);
  const primaryVibe = input.vibe[0] ?? 'mix';

  const days: TripGeneratorDay[] = dates.map((date, index) => ({
    day_number: index + 1,
    date,
    activities: [
      {
        time_slot: 'morning',
        title: `Visita al centro di ${input.destination}`,
        category: 'culture',
        duration_minutes: 120,
        estimated_cost: 15,
        location_hint: `Centro storico, ${input.destination}`,
      },
      {
        time_slot: 'afternoon',
        title: `Attività ${primaryVibe} a ${input.destination}`,
        category: primaryVibe,
        duration_minutes: 150,
        estimated_cost: 30,
        location_hint: `Zona ${primaryVibe}, ${input.destination}`,
      },
      {
        time_slot: 'evening',
        title: `Cena di gruppo`,
        category: 'food',
        duration_minutes: 90,
        estimated_cost: 25,
        location_hint: `Ristorante centrale, ${input.destination}`,
      },
    ],
  }));

  return {
    trip_summary: `[MOCK] ${dates.length} giorni a ${input.destination} per ${input.group_size} persone, vibe ${input.vibe.join('/')}. Questo itinerario è generato senza AI reale (MOCK_AI attivo) per non incorrere in costi durante lo sviluppo.`,
    days,
  };
}

async function callOpenAI(input: TripGeneratorInput): Promise<TripGeneratorOutput> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurata');

  const systemPrompt = `Sei il Trip Generator AI di TRIBE, un'app di pianificazione viaggi di gruppo.
Trasforma i parametri del viaggio in un itinerario giorno-per-giorno completo.
Vincoli obbligatori:
- Rispetta il budget totale indicato (budget_per_person * group_size)
- Bilancia le categorie di attività in base al "vibe" richiesto
- Massimo 3-4 attività per giorno, evita sovraffollamento
- Considera tempi di spostamento realistici tra le location
- Un giorno per ogni data tra start_date e end_date inclusi
Rispondi SOLO con un oggetto JSON con questa forma esatta, nessun altro testo:
{
  "trip_summary": "string",
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "activities": [
        {
          "time_slot": "morning|afternoon|evening",
          "title": "string",
          "category": "string",
          "duration_minutes": 120,
          "estimated_cost": 26,
          "location_hint": "string, nome luogo + città per geocoding"
        }
      ]
    }
  ]
}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.4,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(input) },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI error ${response.status}: ${text}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('Risposta OpenAI vuota');

  const parsed = JSON.parse(content);
  if (!validateOutput(parsed)) {
    throw new Error('Output OpenAI non conforme allo schema atteso');
  }
  return parsed;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Utente non autenticato' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client "identità": solo per verificare CHI sta chiamando, tramite il
    // suo JWT. Non viene usato per scrivere dati.
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utente non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Client "dati": service role, bypassa le RLS. Sicuro qui perché l'identità
    // dell'utente è già stata verificata sopra e ogni riga scritta viene
    // esplicitamente legata a user.id nel codice sottostante (mai a un valore
    // arbitrario fornito dal client).
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    if (!validateInput(body)) {
      return new Response(JSON.stringify({ error: 'Payload non valido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const useMock = Deno.env.get('MOCK_AI') === 'true';
    const aiOutput = useMock ? generateMockTrip(body) : await callOpenAI(body);

    const tripName = `${body.destination} ${new Date(body.start_date).getFullYear()}`;

    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .insert({
        name: tripName,
        destination: body.destination,
        start_date: body.start_date,
        end_date: body.end_date,
        budget_per_person: body.budget_per_person,
        currency: body.currency,
        vibe: body.vibe,
        status: 'planning',
        created_by: user.id,
        ai_generated: true,
      })
      .select()
      .single();

    if (tripError || !trip) {
      throw new Error(`Errore creazione trip: ${tripError?.message}`);
    }

    const { error: memberError } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: 'admin',
      status: 'accepted',
      joined_at: new Date().toISOString(),
    });
    if (memberError) throw new Error(`Errore trip_members: ${memberError.message}`);

    for (const day of aiOutput.days) {
      const { data: dayRow, error: dayError } = await supabase
        .from('itinerary_days')
        .insert({ trip_id: trip.id, day_number: day.day_number, date: day.date })
        .select()
        .single();

      if (dayError || !dayRow) {
        throw new Error(`Errore itinerary_days: ${dayError?.message}`);
      }

      const activitiesPayload = day.activities.map((act, index) => ({
        itinerary_day_id: dayRow.id,
        title: act.title,
        category: act.category,
        time_slot: act.time_slot,
        duration_minutes: act.duration_minutes,
        location_name: act.location_hint,
        source: 'ai',
        status: 'suggested',
        order_index: index,
      }));

      if (activitiesPayload.length > 0) {
        const { error: actError } = await supabase
          .from('itinerary_activities')
          .insert(activitiesPayload);
        if (actError) throw new Error(`Errore itinerary_activities: ${actError.message}`);
      }
    }

    await supabase.from('chat_messages').insert({
      trip_id: trip.id,
      sender_id: null,
      type: 'system',
      content: `Il viaggio "${tripName}" è stato generato dall'AI! 🎉`,
    });

    return new Response(JSON.stringify({ trip_id: trip.id, trip_summary: aiOutput.trip_summary }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore sconosciuto';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
