import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variabili Supabase mancanti. Copia .env.example in .env e valorizza EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// NOTA: il client non è tipizzato con il generic <Database> perché non
// abbiamo ancora i tipi generati dallo schema reale (richiede
// `npx supabase gen types typescript` con la CLI collegata al progetto).
// Il placeholder precedente causava falsi errori TypeScript su .update().
// I tipi di dominio in src/types/database.ts restano comunque la fonte
// di verità per le shape usate manualmente nel codice.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Best practice ufficiale Supabase per React Native: il refresh automatico
// del token va messo in pausa quando l'app è in background, e ripreso
// quando torna in foreground. Senza questo, il token può scadere mentre
// l'app non è attiva e servire un login inatteso al rientro.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
