# TRIBE — Travel OS per gruppi di amici

App mobile-first (React Native + Expo + TypeScript) che sostituisce la
frammentazione Whatsapp + Excel + Booking + Google Maps + Splitwise con un
unico ambiente per organizzare viaggi di gruppo.

Lo spec di prodotto/design/engineering completo vive in `docs/product-spec.md`.

## Stack

| Layer | Tecnologia |
|---|---|
| Frontend mobile | React Native + Expo + TypeScript |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| AI | OpenAI API (function calling / structured outputs) |
| Maps | Mapbox |
| Analytics | PostHog |
| Error tracking | Sentry |
| CI/CD | Expo EAS Build + EAS Update |

## Setup locale

```bash
npm install
cp .env.example .env   # poi valorizza EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY
npm start
```

Serve un progetto Supabase (gratuito) per sviluppare le funzionalità legate
a dati/auth. Le migration in `supabase/migrations/` creano lo schema:

```bash
npx supabase link --project-ref <tuo-project-ref>
npx supabase db push
```

## Struttura progetto

```
src/
  screens/       una cartella per schermata (Splash, Login, Home, ...)
  components/    componenti UI riutilizzabili
  navigation/     React Navigation stack/tab
  lib/            client Supabase, wrapper API esterne
  hooks/          custom hooks (auth, realtime subscriptions, ecc.)
  types/          tipi TypeScript di dominio, allineati allo schema DB
  constants/      design tokens (colori, tipografia, spacing)
supabase/
  migrations/     schema SQL + RLS policies
  functions/      Edge Functions (orchestrazione AI, business logic sensibile)
```

## Design system

Dark mode first, nessuna versione light in V1. Palette, tipografia (Inter +
JetBrains Mono per i numeri) e componenti base sono in `src/constants/theme.ts`,
derivati da `docs/product-spec.md` §2.

## Stato sviluppo

Scaffold iniziale: navigazione base (Login → Home), client Supabase, schema
DB + RLS, design tokens. Le 12 schermate principali e i 4 motori AI (Trip
Generator, Budget Optimizer, Activity Recommender, Group Decision) sono da
implementare seguendo la roadmap in `docs/product-spec.md` §9-10.

## Sicurezza

- Nessuna chiave segreta (OpenAI, Mapbox server-side, Supabase service role)
  deve mai finire nel client o in variabili `EXPO_PUBLIC_*`: passano solo da
  Supabase Edge Functions.
- RLS attiva su ogni tabella con `trip_id`: accesso solo se membro accettato
  del trip (vedi `supabase/migrations/00002_rls_policies.sql`).
