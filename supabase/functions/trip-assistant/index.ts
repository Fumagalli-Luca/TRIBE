// Edge Function: trip-assistant
// "Cervello" condiviso dell'assistente AI del viaggio: raccoglie il contesto
// (itinerario, budget, voti, checklist) e risponde a una domanda libera.
// Usata sia dal tag @tribe in chat di gruppo sia dalla tab "Assistente" privata:
// non scrive nulla sul DB, restituisce solo la risposta — è il client a
// decidere dove salvarla (chat_messages o ai_conversations).
//
// Env: stesse di generate-trip (OPENAI_API_KEY, MOCK_AI).

import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_MODEL = 'gpt-4o-mini';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AssistantInput {
  trip_id: string;
  question: string;
}

function validateInput(body: unknown): body is AssistantInput {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.trip_id === 'string' &&
    typeof b.question === 'string' &&
    b.question.trim().length > 0
  );
}

async function buildContext(supabase: ReturnType<typeof createClient>, tripId: string): Promise<string> {
  const { data: trip } = await supabase
    .from('trips')
    .select('name, destination, start_date, end_date, budget_per_person, currency, vibe')
    .eq('id', tripId)
    .single();

  const { count: memberCount } = await supabase
    .from('trip_members')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .eq('status', 'accepted');

  const { data: days } = await supabase
    .from('itinerary_days')
    .select('id, day_number, date')
    .eq('trip_id', tripId)
    .order('day_number', { ascending: true });

  let itineraryText = 'Nessun itinerario ancora.';
  if (days && days.length > 0) {
    const { data: activities } = await supabase
      .from('itinerary_activities')
      .select('itinerary_day_id, title, time_slot, status')
      .in('itinerary_day_id', (days as { id: string }[]).map((d) => d.id))
      .neq('status', 'removed');

    itineraryText = (days as { id: string; day_number: number; date: string }[])
      .map((d) => {
        const dayActs = ((activities as { itinerary_day_id: string; title: string; time_slot: string | null }[]) ?? [])
          .filter((a) => a.itinerary_day_id === d.id)
          .map((a) => `${a.time_slot ?? ''}: ${a.title}`)
          .join('; ');
        return `Giorno ${d.day_number} (${d.date}): ${dayActs || 'nessuna attività'}`;
      })
      .join('\n');
  }

  const { data: expenses } = await supabase.from('expenses').select('amount, category').eq('trip_id', tripId);
  const expenseList = (expenses as { amount: number; category: string | null }[]) ?? [];
  const totalSpent = expenseList.reduce((sum, e) => sum + Number(e.amount), 0);
  const byCategory = new Map<string, number>();
  for (const e of expenseList) {
    const cat = e.category ?? 'other';
    byCategory.set(cat, (byCategory.get(cat) ?? 0) + Number(e.amount));
  }
  const categoryText = Array.from(byCategory.entries())
    .map(([cat, amount]) => `${cat}: ${amount.toFixed(0)}`)
    .join(', ') || 'nessuna spesa registrata';

  const { data: openVotes } = await supabase
    .from('votes')
    .select('title')
    .eq('trip_id', tripId)
    .eq('status', 'open');

  const { count: pendingChecklist } = await supabase
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId)
    .eq('is_done', false);

  const tripRow = trip as {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    budget_per_person: number | null;
    currency: string;
    vibe: string[] | null;
  } | null;

  const budgetTotal = tripRow?.budget_per_person ? tripRow.budget_per_person * (memberCount ?? 1) : null;

  return `
Viaggio: ${tripRow?.name ?? 'sconosciuto'} a ${tripRow?.destination ?? '?'}
Date: ${tripRow?.start_date ?? '?'} — ${tripRow?.end_date ?? '?'}
Partecipanti: ${memberCount ?? 0}
Vibe: ${tripRow?.vibe?.join(', ') ?? 'non specificato'}
Budget totale stimato: ${budgetTotal ?? 'non impostato'} ${tripRow?.currency ?? ''}
Speso finora: ${totalSpent.toFixed(0)} ${tripRow?.currency ?? ''} (per categoria: ${categoryText})
Voti aperti: ${((openVotes as { title: string }[]) ?? []).map((v) => v.title).join(', ') || 'nessuno'}
Checklist da completare: ${pendingChecklist ?? 0}

Itinerario:
${itineraryText}
`.trim();
}

function generateMockAnswer(question: string): string {
  return `[MOCK] Non posso chiamare un vero modello AI ora (MOCK_AI attivo), ma ho ricevuto la tua domanda: "${question}". In modalità reale userei i dati del viaggio qui sopra per darti una risposta utile e specifica.`;
}

async function callOpenAI(context: string, question: string): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY non configurata');

  const systemPrompt = `Sei l'assistente AI di TRIBE, un'app di pianificazione viaggi di gruppo. Rispondi in italiano, in modo breve, utile e concreto, usando i dati del viaggio forniti di seguito. Se non hai abbastanza informazioni per rispondere con certezza, dillo chiaramente invece di inventare. Non usare markdown pesante, solo testo semplice adatto a un messaggio di chat.

Dati del viaggio:
${context}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.5,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
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
  return content;
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

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Utente non valido' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    if (!validateInput(body)) {
      return new Response(JSON.stringify({ error: 'Payload non valido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Le query di contesto passano dal client identità: rispettano le RLS
    // esistenti, quindi funzionano solo se il chiamante è davvero membro
    // del viaggio (altrimenti tornano vuote/errore).
    const context = await buildContext(supabase, body.trip_id);

    const useMock = Deno.env.get('MOCK_AI') === 'true';
    const answer = useMock ? generateMockAnswer(body.question) : await callOpenAI(context, body.question);

    return new Response(JSON.stringify({ answer }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
