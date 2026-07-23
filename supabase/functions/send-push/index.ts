// Edge Function: send-push
// Invia push notification ai membri di un viaggio tramite Expo Push Service
// (https://exp.host/--/api/v2/push/send). Gratuito e senza chiavi a pagamento:
// funziona da subito in dev, e in produzione basta un build EAS con push
// credentials configurate (nessun secret da impostare qui).

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendPushInput {
  trip_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function validateInput(body: unknown): body is SendPushInput {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.trip_id === 'string' &&
    typeof b.title === 'string' &&
    typeof b.body === 'string'
  );
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

    const body = await req.json();
    if (!validateInput(body)) {
      return new Response(JSON.stringify({ error: 'Payload non valido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Il chiamante deve essere membro accettato del viaggio: verifica con la
    // stessa RLS "is_trip_member" leggendo tramite il client identità.
    const { data: callerMembership } = await supabaseAuth
      .from('trip_members')
      .select('id')
      .eq('trip_id', body.trip_id)
      .eq('user_id', user.id)
      .eq('status', 'accepted')
      .maybeSingle();

    if (!callerMembership) {
      return new Response(JSON.stringify({ error: 'Non sei membro di questo viaggio' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: members } = await supabase
      .from('trip_members')
      .select('user:users(push_token)')
      .eq('trip_id', body.trip_id)
      .eq('status', 'accepted')
      .neq('user_id', user.id);

    const tokens = ((members as unknown as { user: { push_token: string | null } | null }[]) ?? [])
      .map((m) => m.user?.push_token)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const messages = tokens.map((to) => ({
      to,
      title: body.title,
      body: body.body,
      data: body.data ?? {},
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });

    return new Response(JSON.stringify({ sent: tokens.length }), {
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
