-- TRIBE — riattiva RLS su trips
-- Durante il debug della edge function generate-trip, RLS era stata
-- disabilitata manualmente su questa tabella per bypassare un errore di
-- permessi. La causa reale era la edge function che scriveva con un client
-- autenticato come utente (soggetto a RLS) invece che con la service role
-- key (vedi supabase/functions/generate-trip/index.ts). Con quel fix, RLS
-- può e deve restare attiva: nessun altro punto dell'app scrive su trips
-- lato client con permessi elevati.

alter table trips enable row level security;
