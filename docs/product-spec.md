# TRIBE — Travel OS per gruppi di amici
### Product Spec · Engineering Spec · Design System · Investor Overview
**Versione documento:** 1.0 · **Data:** Luglio 2026 · **Status:** Ready for build

---

## 0. Executive Summary

**TRIBE** è il primo *Travel Operating System* pensato per gruppi di amici (18–30 anni), non un'app di viaggi. Un OS perché non si limita a mostrare contenuti: **crea, decide, traccia e ottimizza** l'intero ciclo di vita di un viaggio di gruppo — dalla proposta iniziale al replay finale — sostituendo la frammentazione attuale (Whatsapp + Excel + Booking + Google Maps + Splitwise) con un unico ambiente.

**Problema:** organizzare un viaggio di gruppo oggi richiede 5-7 strumenti diversi, decine di messaggi, un foglio Excel per i soldi e settimane di indecisione collettiva.

**Soluzione:** un'app mobile-first, AI-native, dove il gruppo crea il viaggio in una chat guidata, l'AI genera l'itinerario, il budget si traccia da solo, le decisioni si prendono per swipe e tutto vive in un'unica dashboard.

**Tesi di prodotto:** *"Eliminiamo il caos organizzativo, le decisioni manuali infinite e la frammentazione tra app."*

---

## 1. Visione & Posizionamento

### 1.1 Cos'è TRIBE
Un sistema operativo per il viaggio di gruppo, composto da 4 moduli integrati:

| Modulo | Funzione |
|---|---|
| **Trip Engine** | Creazione e gestione del viaggio (date, luoghi, membri) |
| **Money Engine** | Budget condiviso, spese, split, saldi |
| **Decision Engine** | Voting system, chat, risoluzione conflitti di gruppo |
| **AI Engine** | Generazione itinerari, ottimizzazione budget, raccomandazioni |

### 1.2 Cosa NON è
Non è un OTA (Online Travel Agency), non è un social network di viaggio, non è un semplice expense splitter. È l'infrastruttura che orchestra tutti questi bisogni in un unico flusso.

### 1.3 Target primario
- Età: 18–30 anni
- Gruppi: 3–10 amici
- Budget: low/mid (viaggi da 150€ a 800€ a persona)
- Motivazione: esperienza, socialità, party, scoperta — non lusso o relax

### 1.4 Insight chiave
Il vero prodotto non è il viaggio: è **la riduzione dell'attrito decisionale in un gruppo**. Ogni feature deve rispondere alla domanda: *"Questo riduce il numero di decisioni manuali che il gruppo deve prendere?"*

---

## 2. Design System

### 2.1 Filosofia visiva
Ispirazione: **Revolut** (financial clarity) + **Spotify** (dark, ritmico, personale) + **Airbnb** (calore, foto, trust) + **Apple** (rigore, spazio, tipografia).

Dark mode first, nessuna versione light in V1.

### 2.2 Palette colori

```
Background     #0B0B0F   /* base app, quasi nero */
Surface        #161622   /* card, sheet, modali */
Primary        #7C3AED   /* violetto — CTA primari, brand */
Accent         #38BDF8   /* azzurro — link, stati attivi, highlight */
Success        #22C55E   /* conferme, saldi positivi, check */
Danger         #EF4444   /* saldi negativi, errori (non richiesto ma necessario) */
Text           #FFFFFF
Text Muted     #A1A1AA
Border         #26263A   /* separatori sottili, 8% white su surface */
```

Gradiente primario bottoni: `linear-gradient(135deg, #7C3AED 0%, #38BDF8 100%)`.

### 2.3 Tipografia

- **Inter** — UI, titoli, corpo testo (400/500/600/700)
- **JetBrains Mono** — tutti i numeri: prezzi, saldi, date, countdown, percentuali

Scala tipografica:
```
Display   32/40  Inter Bold        — hero, splash
H1        24/32  Inter Semibold    — titoli schermata
H2        18/24  Inter Semibold    — titoli sezione/card
Body      15/22  Inter Regular     — testo corrente
Caption   13/18  Inter Regular     — label, meta info
Mono-lg   22/28  JetBrains Bold    — importi principali
Mono-sm   14/20  JetBrains Medium  — importi secondari, date
```

### 2.4 Componenti UI base

- **Card**: `radius 20px`, `background: Surface`, `border 1px Border`, ombra soft `0 8px 24px rgba(0,0,0,.35)`
- **Bottone primario**: gradient fill, `radius 16px`, altezza 52px, testo Inter Semibold 16
- **Bottone secondario**: outline 1px Border, testo Accent
- **Bottom navigation**: 5 tab, glass blur (`backdrop-filter: blur(20px)`, `background: rgba(22,22,34,.72)`), icone outline → filled su stato attivo con micro-scale 1.1
- **Glassmorphism**: usato solo su overlay leggeri (bottom nav, top bar in scroll, modali di conferma) — mai su intere schermate, per non compromettere leggibilità
- **Swipe card**: usata nel voting system, drag threshold 120px, rotazione max 12° in drag
- **Chip/Tag**: radius pieno (999px), padding 6/12, background Surface + Border

### 2.5 Iconografia
Set outline (stroke 1.5px) stile Phosphor Icons o Lucide, coerente con Inter. Stato attivo = versione filled + colore Accent o Primary.

### 2.6 Motion
- Transizioni schermata: 280ms ease-out, slide + fade
- Micro-interazioni: 120-180ms
- AI loading: animazione loop 1.4s con pulse + particelle (vedi schermata 6)
- Haptic feedback su: swipe vote, conferma spesa, invio AI prompt (mobile native)

---

## 3. User Flow End-to-End

```
Install app
   │
   ▼
Login (Google / Apple / Email)
   │
   ▼
Onboarding (3 step) ── skip disponibile
   │
   ▼
Home Dashboard (vuota → empty state con CTA "Crea il tuo primo viaggio")
   │
   ▼
Create Trip (AI guided chat flow)
   │
   ▼
AI Loading Screen (generazione itinerario)
   │
   ▼
Trip Overview Dashboard (bozza)
   │
   ▼
Invita amici (link/QR/contatti)
   │
   ▼
Gruppo formato (membri accettano)
   │
   ├──► Budget Tracker (spese via via che accadono)
   ├──► Voting System (decisioni: hotel, attività, ristoranti)
   ├──► Chat viaggio (parallela, sempre accessibile)
   ├──► Itinerary giornaliero (si aggiorna con voti/AI)
   └──► Checklist condivisa
   │
   ▼
Trip Live Dashboard (durante il viaggio: countdown → "in corso" → giorno per giorno)
   │
   ▼
Replay finale (riepilogo: spese totali, saldo per persona, timeline foto/momenti)
```

**Principio di flusso:** ogni ramo dopo "Gruppo formato" è accessibile in parallelo dalla Trip Dashboard — non è un flusso lineare forzato, è un hub.

---

## 4. Schermate (Figma-style spec)

Per ognuna: **Layout · Componenti · Comportamento · Micro-interazioni**

### 4.1 Splash Screen
- **Layout**: fullscreen Background #0B0B0F, logo TRIBE centrato (wordmark Inter Bold + simbolo astratto tipo "nodo di persone")
- **Componenti**: logo animato, nessun testo secondario
- **Comportamento**: durata max 1.2s, poi check auth state → redirect a Login o Home
- **Micro-interazioni**: logo fade-in + scale da 0.9 a 1.0, glow pulse sottile in accent color dietro il simbolo

### 4.2 Login
- **Layout**: bottom-sheet style su sfondo con illustrazione astratta gradient (Primary→Accent, blur pesante, tipo aurora)
- **Componenti**: bottone "Continua con Google" (bianco, logo colorato), "Continua con Apple" (bianco/outline), divider "oppure", input email + bottone "Continua con email" (magic link, no password in V1)
- **Comportamento**: OAuth nativo, su email invio magic link via Supabase Auth
- **Micro-interazioni**: bottoni con leggero scale-down (0.97) al tap, loading spinner inline nel bottone premuto

### 4.3 Onboarding (3 step)
- **Step 1 — "Il tuo gruppo, un solo posto"**: illustrazione card di viaggio, chat, budget sovrapposte
- **Step 2 — "L'AI crea l'itinerario per te"**: illustrazione chat AI con bubble che si trasforma in itinerario
- **Step 3 — "Decidete insieme, senza stress"**: illustrazione swipe voting
- **Componenti**: dot indicator, bottone "Avanti" / "Inizia", link "Salta" in alto a destra
- **Comportamento**: swipe orizzontale tra step, salvataggio flag `onboarding_completed` su primo skip/completamento
- **Micro-interazioni**: parallax leggero tra illustrazione e testo durante swipe

### 4.4 Home Dashboard (lista viaggi)
- **Layout**: top bar con avatar utente + notifiche, sezione "Viaggi attivi" (card grande, prossimo viaggio in evidenza con countdown), sezione "Prossimi" (card orizzontali scroll), sezione "Passati" (card compatte, greyed)
- **Componenti**: Trip Card (cover photo/gradient, nome viaggio, date, avatar stack membri, badge stato: "In corso" / "Tra 12 giorni" / "Da pianificare"), FAB (+) per nuovo viaggio
- **Comportamento**: tap su card → Trip Overview Dashboard; empty state se nessun viaggio con CTA centrale
- **Micro-interazioni**: countdown in Mono font che si aggiorna real-time sul trip attivo; pull-to-refresh

### 4.5 Create Trip (AI guided flow, tipo chat)
- **Layout**: interfaccia conversazionale full screen, bubble AI a sinistra, risposte utente come quick-reply chip o input libero a destra
- **Flusso conversazione** (esempio):
  1. AI: "Dove vi va di andare? 🌍" → chip destinazioni popolari + input libero
  2. AI: "Quando partite?" → date picker inline
  3. AI: "Quanti siete e con che budget a testa?" → stepper numerico + slider budget
  4. AI: "Che vibe cercate?" → chip multi-select (Party 🎉 / Relax 🌊 / Cultura 🏛️ / Avventura 🏔️ / Mix)
  5. AI: "Perfetto, genero il vostro viaggio!" → transizione a loading screen
- **Componenti**: chat bubble, quick-reply chips, date range picker, budget slider con valore in Mono font
- **Comportamento**: ogni risposta salva in stato locale, alla fine invia payload al Trip Generator AI
- **Micro-interazioni**: typing indicator AI (3 dot pulse) prima di ogni domanda, bubble che appaiono con slide-up + fade

### 4.6 AI Loading Screen
- **Layout**: fullscreen, centrato
- **Componenti**: animazione "thinking" (particelle/nodi che si connettono formando una mappa stilizzata), testo rotante ("Sto cercando i posti migliori...", "Costruisco l'itinerario...", "Ottimizzo il budget...")
- **Comportamento**: durata reale legata a risposta API (skeleton se >3s), timeout fallback a 12s con messaggio di retry
- **Micro-interazioni**: testo che cambia con crossfade ogni 1.8s, particelle in loop continuo, progress bar sottile in basso non lineare (dà percezione di avanzamento)

### 4.7 Trip Overview Dashboard
- **Layout**: header con cover image/gradient + nome viaggio + date + countdown, sotto tab orizzontali (Itinerario / Budget / Gruppo / Chat / Checklist), sotto contenuto scrollabile del tab attivo
- **Componenti**: hero header parallax on scroll, avatar stack membri con tap → Group screen, quick stats (giorni rimanenti, budget speso/totale, decisioni in sospeso con badge count)
- **Comportamento**: tab persistenti in scroll (sticky), badge rosso su tab con azioni pendenti (es. voti da esprimere)
- **Micro-interazioni**: header si comprime in scroll (collapsing toolbar), cover image con effetto ken-burns lento

### 4.8 Itinerary (giornaliero)
- **Layout**: timeline verticale per giorno, tab orizzontale in alto per selezionare il giorno (Day 1, Day 2...), ogni giorno mostra blocchi orari (mattina/pomeriggio/sera)
- **Componenti**: Activity Card (foto, nome, orario, categoria icon, durata stimata, tag "AI suggerito" o "Confermato dal gruppo"), bottone "+ Aggiungi attività", bottone "Rigenera con AI" per singolo blocco
- **Comportamento**: drag-to-reorder attività nello stesso giorno; tap su card espande dettaglio (mappa mini, note, link)
- **Micro-interazioni**: swipe su Activity Card per azioni rapide (conferma / rimuovi / vota), linea timeline animata che si disegna on scroll

### 4.9 Budget Tracker (split expenses)
- **Layout**: header con totale speso vs budget (barra progresso circolare o lineare, colore Success/Danger dinamico), sezione "Il tuo saldo" (chi deve a chi, semplificato tipo Splitwise), lista spese cronologica
- **Componenti**: Expense Card (categoria icon, descrizione, importo Mono font grande, chi ha pagato, avatar dei partecipanti allo split), FAB "+ Aggiungi spesa", filtro per categoria
- **Comportamento**: form aggiunta spesa con split automatico equo (editabile: quote custom, escludi membri), calcolo automatico saldi netti tra tutti i membri (algoritmo di minimizzazione transazioni)
- **Micro-interazioni**: numero totale che anima in count-up quando cambia, barra progresso che cambia colore gradualmente Success→Danger avvicinandosi/superando il budget

### 4.10 Group Management
- **Layout**: lista membri con avatar, nome, ruolo (Admin/Membro), stato invito (Confermato/In attesa)
- **Componenti**: card membro con quick info (quanto ha speso, quanto deve), bottone "Invita" (genera link/QR/condividi), bottone rimuovi membro (solo admin)
- **Comportamento**: link di invito con scadenza 7gg, deep link che apre l'app o mostra landing di download
- **Micro-interazioni**: QR code generato dinamicamente con brand styling (colori TRIBE), toast di conferma su invito inviato

### 4.11 Chat viaggio
- **Layout**: chat standard, ma con bubble speciali per eventi di sistema (es. "Marco ha aggiunto una spesa di 45€", "Nuovo voto: Hotel A vs Hotel B")
- **Componenti**: bubble testo standard, bubble sistema (compatte, centrate, background trasparente con icona), input con allegati (foto, posizione), reazioni emoji rapide
- **Comportamento**: eventi da Budget/Voting/Itinerary si propagano come messaggi di sistema automatici in chat (system feed integrato)
- **Micro-interazioni**: bubble sistema cliccabile → deep link alla schermata pertinente (es. tap su "nuovo voto" apre Voting screen)

### 4.12 Voting System (decisioni gruppo, swipe style)
- **Layout**: fullscreen card stack (stile Tinder), card in primo piano con opzione (foto, nome, prezzo, rating), indicatori sotto (❌ / ❤️)
- **Componenti**: card opzione, contatore "3/6 hanno votato", bottone skip, risultato finale (bar chart con percentuale voti per opzione)
- **Comportamento**: swipe destra = sì, sinistra = no; quando tutti i membri votano (o timeout 24h) l'AI (Group Decision AI) determina il vincitore e lo propone in chat/itinerario
- **Micro-interazioni**: card ruota seguendo il drag, colore overlay verde/rosso in base a direzione, haptic al rilascio, confetti animation sulla card vincitrice a fine votazione

### 4.13 Checklist
- **Layout**: lista raggruppata per categoria (Documenti / Bagagli / Prenotazioni / Altro), ogni item con checkbox
- **Componenti**: item checklist (checkbox, testo, assegnatario opzionale, badge "personale" vs "condiviso"), bottone "+ Aggiungi", suggerimenti AI pre-compilati in base a destinazione (es. "Documento identità", "Adattatore presa")
- **Comportamento**: item condivisi visibili a tutti con stato sync real-time; item personali visibili solo al creatore
- **Micro-interazioni**: check con animazione strike-through + fade, progress bar categoria che si riempie

### 4.14 (Future) Party Radar / Map Events
- **Layout**: mappa fullscreen (Mapbox, tema dark custom) con pin eventi/locali in tempo reale
- **Componenti**: pin categorizzati (🎉 party, 🍸 bar, 🎶 live music), bottom sheet con dettaglio evento on tap, filtro categoria in top bar
- **Comportamento**: dati da integrazione eventi locali + segnalazioni community (V4)
- **Micro-interazioni**: pin con pulse animation se evento "live ora", clustering automatico su zoom out

---

## 5. Database Schema (Supabase / PostgreSQL)

Convenzioni: `id` sempre `uuid default gen_random_uuid()`, timestamp `timestamptz`, soft delete dove sensato (`deleted_at`), RLS attiva su tutte le tabelle.

### 5.1 `users`
```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text unique,
  avatar_url text,
  email text unique not null,
  phone text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```
Relazione 1:1 con `auth.users` di Supabase Auth. Contiene solo dati di profilo pubblico/app-level.

### 5.2 `trips`
```sql
create table trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  cover_image_url text,
  start_date date not null,
  end_date date not null,
  budget_per_person numeric(10,2),
  currency text default 'EUR',
  vibe text[], -- es. ['party','cultura']
  status text default 'draft', -- draft | planning | live | completed | archived
  created_by uuid references users(id),
  ai_generated boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```
Entità centrale. Ogni altra tabella (eccetto `users`) referenzia `trip_id`.

### 5.3 `trip_members`
```sql
create table trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  role text default 'member', -- admin | member
  status text default 'pending', -- pending | accepted | declined
  invited_by uuid references users(id),
  joined_at timestamptz,
  created_at timestamptz default now(),
  unique (trip_id, user_id)
);
```
Relazione N:N tra `users` e `trips`. `role='admin'` per il creatore, gestibile in gruppo.

### 5.4 `expenses`
```sql
create table expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  paid_by uuid references users(id),
  description text not null,
  amount numeric(10,2) not null,
  currency text default 'EUR',
  category text, -- food | transport | accommodation | activity | other
  split_type text default 'equal', -- equal | custom | percentage
  created_at timestamptz default now()
);

create table expense_splits (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid references expenses(id) on delete cascade,
  user_id uuid references users(id),
  amount_owed numeric(10,2) not null,
  settled boolean default false
);
```
`expenses` = evento di spesa; `expense_splits` = quota dovuta da ogni membro (permette split custom/percentuale). I saldi netti si calcolano applicativamente (algoritmo di minimizzazione transazioni) e possono essere cachati in una view materializzata `trip_balances`.

### 5.5 `votes`
```sql
create table votes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null, -- es "Hotel per Barcellona"
  category text, -- hotel | activity | restaurant | general
  options jsonb not null, -- [{id, name, image_url, price, meta}]
  status text default 'open', -- open | closed
  deadline timestamptz,
  winning_option_id text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table vote_choices (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid references votes(id) on delete cascade,
  user_id uuid references users(id),
  option_id text not null,
  choice text not null, -- yes | no
  created_at timestamptz default now(),
  unique (vote_id, user_id, option_id)
);
```
`options` in JSONB per flessibilità (numero variabile di opzioni senza tabella dedicata). `vote_choices` traccia ogni swipe.

### 5.6 `chat_messages`
```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  sender_id uuid references users(id), -- null se system message
  type text default 'text', -- text | system | image | location
  content text,
  metadata jsonb, -- link a entità (expense_id, vote_id, ecc.)
  created_at timestamptz default now()
);
```
I messaggi di sistema (`type='system'`) sono generati da trigger su `expenses`, `votes`, `itinerary` per popolare il feed automaticamente.

### 5.7 `checklist_items`
```sql
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  title text not null,
  category text default 'other', -- documents | packing | bookings | other
  scope text default 'shared', -- shared | personal
  assigned_to uuid references users(id),
  is_done boolean default false,
  ai_suggested boolean default false,
  created_at timestamptz default now()
);
```

### 5.8 `itinerary`
```sql
create table itinerary_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  day_number int not null,
  date date not null,
  unique (trip_id, day_number)
);

create table itinerary_activities (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid references itinerary_days(id) on delete cascade,
  title text not null,
  category text, -- food | culture | party | outdoor | transport
  time_slot text, -- morning | afternoon | evening
  start_time time,
  duration_minutes int,
  location_name text,
  lat numeric,
  lng numeric,
  image_url text,
  source text default 'ai', -- ai | manual | vote_result
  status text default 'suggested', -- suggested | confirmed | removed
  order_index int default 0,
  created_at timestamptz default now()
);
```

### 5.9 `bookings` (future — V3+)
```sql
create table bookings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid references trips(id) on delete cascade,
  type text not null, -- flight | hotel | activity
  provider text, -- amadeus | booking | viator
  external_reference text,
  status text default 'pending', -- pending | confirmed | cancelled
  total_price numeric(10,2),
  currency text default 'EUR',
  raw_payload jsonb,
  created_at timestamptz default now()
);
```

### 5.10 Note su sicurezza dati (RLS)
Ogni tabella con `trip_id` ha policy RLS del tipo: *"l'utente può leggere/scrivere solo se esiste una riga in `trip_members` con `user_id = auth.uid()` e `trip_id` corrispondente e `status='accepted'"*. Le azioni di scrittura sensibili (rimuovi membro, chiudi voto) richiedono `role='admin'`.

---

*(Il documento prosegue nella parte 2: Architettura Tecnica, AI System, API esterne, MVP, Roadmap, Business Model)*

## 6. Architettura Tecnica

### 6.1 Stack

| Layer | Tecnologia | Motivazione |
|---|---|---|
| Frontend mobile | React Native + Expo + TypeScript | time-to-market, un solo codebase iOS/Android, OTA update via EAS |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) | Postgres relazionale robusto per budget/split, Auth pronto, Realtime per chat/voting, RLS per sicurezza dati senza backend custom |
| AI | OpenAI API (function calling + structured outputs) | generazione itinerari, ottimizzazione, raccomandazioni |
| Maps | Mapbox | mappe dark-theme custom, geocoding, futuro Party Radar |
| Analytics | PostHog | funnel onboarding→primo viaggio, feature adoption, retention cohort |
| Error tracking | Sentry | crash reporting RN, performance monitoring |
| CI/CD | Expo EAS Build + EAS Update | build automatizzate, OTA update per fix non-nativi |

### 6.2 Diagramma di comunicazione tra sistemi

```
+----------------------+
|   React Native App    |
|  (Expo, TypeScript)   |
+-----------+-----------+
            | HTTPS / WSS
            v
+-------------------------------+
|          Supabase              |
|  +--------+  +-------------+   |
|  |  Auth  |  |  Postgres   |   |
|  +--------+  |  + RLS      |   |
|  +--------+  +-------------+   |
|  |Storage |  +-------------+   |
|  +--------+  |  Realtime   |   |
|              |  chat/vote  |   |
|              +-------------+   |
|  +---------------------------+ |
|  |   Edge Functions           | |
|  |  business logic, AI        | |
|  |  orchestration, webhooks   | |
|  +-------------+-------------+ |
+----------------|---------------+
                  | server-to-server (API key mai nel client)
     +------------+-----+---------+
     v            v     v         v
  OpenAI       Mapbox  PostHog  Sentry
  (4 AI        (mappe, (analytics)(errors)
  engine)      geocode)
```

### 6.3 Data flow — esempio "Create Trip"

1. Utente completa chat guidata -> client invia payload (destinazione, date, budget, vibe) a **Edge Function** `generate-trip`.
2. Edge Function chiama **Trip Generator AI** (OpenAI, structured output JSON).
3. Edge Function valida output, scrive su `trips`, `itinerary_days`, `itinerary_activities`.
4. Trigger Postgres inserisce messaggio di sistema in `chat_messages`.
5. Supabase Realtime notifica il client -> redirect automatico a Trip Overview Dashboard.
6. Client fa subscribe su `trips:id=eq.<id>` per aggiornamenti futuri (voti, spese) via canale Realtime.

### 6.4 Sicurezza (base)

- **Auth**: Supabase Auth (OAuth Google/Apple + magic link email), JWT short-lived + refresh token gestito da SDK ufficiale
- **RLS ovunque**: nessuna tabella accessibile senza policy esplicita, principio least-privilege
- **API keys sensibili** (OpenAI, Mapbox server-side) mai esposte al client: tutte le chiamate AI passano da Edge Functions
- **Rate limiting**: su Edge Functions per endpoint AI (costo token) — max N richieste/utente/ora
- **Storage**: bucket privati per foto viaggio con signed URL a scadenza, bucket pubblico solo per avatar/cover generiche
- **Validazione input**: schema Zod lato client + lato Edge Function (mai fidarsi solo del client)
- **PII minimization**: telefono opzionale, nessun dato di pagamento salvato in V1 (nessuna integrazione Stripe fino a V3)

### 6.5 Scalabilità (considerazioni MVP -> V2)

- Postgres single-region in MVP (EU, vicino al target utenti); read replica quando il traffico lo giustifica
- Edge Functions stateless, scaling automatico gestito da Supabase
- Cache applicativa per risposte AI ripetute simili (es. destinazioni popolari) per ridurre costo token
- Realtime channel per trip, non globale, per limitare fan-out

---

## 7. AI System — Core del Prodotto

TRIBE ha **4 motori AI separati**, ognuno con responsabilità precisa. Nessuno è un chatbot generico: ogni motore ha input/output strutturati e prompt dedicati.

### 7.1 Trip Generator AI

**Scopo:** trasformare le risposte della chat guidata in un itinerario giorno-per-giorno completo.

**Input (JSON):**
```json
{
  "destination": "Barcellona",
  "start_date": "2026-09-10",
  "end_date": "2026-09-13",
  "group_size": 6,
  "budget_per_person": 350,
  "currency": "EUR",
  "vibe": ["party", "cultura"]
}
```

**Output (JSON, structured output OpenAI):**
```json
{
  "trip_summary": "3 giorni a Barcellona tra cultura e vita notturna...",
  "days": [
    {
      "day_number": 1,
      "date": "2026-09-10",
      "activities": [
        {
          "time_slot": "morning",
          "title": "Sagrada Familia",
          "category": "culture",
          "duration_minutes": 120,
          "estimated_cost": 26,
          "location_hint": "Sagrada Familia, Barcelona"
        }
      ]
    }
  ]
}
```

**Prompt strategy:** system prompt fissa vincoli (rispetta budget totale, bilancia categorie in base a `vibe`, evita sovraffollamento — max 3-4 attività/giorno, considera tempi di spostamento realistici tra location). Uso di **function calling con schema JSON forzato** per garantire output parsabile senza post-processing fragile. Temperature bassa (~0.4) per coerenza, non creatività eccessiva.

**Post-processing:** geocoding delle `location_hint` via Mapbox per ottenere `lat/lng` reali prima del salvataggio in DB.

---

### 7.2 Budget Optimizer AI

**Scopo:** dato un budget target e le spese/attività pianificate, suggerire aggiustamenti per rientrare nel budget o ottimizzare l'allocazione.

**Input:**
```json
{
  "budget_total": 2100,
  "budget_per_person": 350,
  "planned_activities": [ {"title": "...", "estimated_cost": 26, "category": "culture"} ],
  "current_expenses_sum": 1450,
  "days_remaining": 2
}
```

**Output:**
```json
{
  "status": "over_budget",
  "delta": 180,
  "suggestions": [
    {"action": "downgrade", "target": "Cena Day 2", "saving_estimate": 40, "reason": "Alternativa simile più economica nella stessa zona"},
    {"action": "remove", "target": "Tour guidato extra", "saving_estimate": 60, "reason": "Attività opzionale, basso impatto sulla vibe party/cultura"}
  ]
}
```

**Prompt strategy:** l'AI non decide autonomamente — **propone**, il gruppo vota (si integra col Group Decision AI / Voting System). Priorità di taglio: attività opzionali > upgrade non essenziali > mai su alloggio/trasporto già confermati.

---

### 7.3 Activity Recommender AI

**Scopo:** suggerire esperienze locali (ristoranti, locali, attività) in base a vibe del gruppo, posizione e fascia oraria, per riempire slot vuoti dell'itinerario o rispondere a richieste dirette in chat ("cerca un posto per l'aperitivo stasera").

**Input:**
```json
{
  "location": {"lat": 41.38, "lng": 2.17},
  "time_slot": "evening",
  "vibe": ["party"],
  "budget_range": "low-mid",
  "group_size": 6,
  "already_visited": ["Razzmatazz"]
}
```

**Output:**
```json
{
  "recommendations": [
    {"name": "Sala Apolo", "category": "party", "price_level": 2, "why": "Locale con buona reputazione tra i giovani per musica live e club nights, adatto a gruppi numerosi"}
  ]
}
```

**Prompt strategy:** combina knowledge del modello con dati reali (in V2+, integrazione **Google Places** per rating/orari reali — l'AI struttura solo la selezione e il "why", non inventa dati fattuali su prezzi/orari che devono venire da fonte esterna verificata).

---

### 7.4 Group Decision AI

**Scopo:** gestire la logica delle votazioni — determinare il vincitore, gestire pareggi, decidere quando chiudere un voto, e formulare il messaggio di annuncio in chat.

**Input:**
```json
{
  "vote_id": "uuid",
  "options": [ {"id": "A", "votes_yes": 4, "votes_no": 1}, {"id": "B", "votes_yes": 3, "votes_no": 2} ],
  "total_members": 6,
  "votes_cast": 5,
  "deadline_passed": false
}
```

**Output:**
```json
{
  "action": "wait",
  "reason": "1 membro non ha ancora votato e la deadline non è scaduta",
  "leading_option": "A"
}
```
oppure, a decisione chiusa:
```json
{
  "action": "declare_winner",
  "winning_option": "A",
  "announcement_message": "Il gruppo ha scelto l'Hotel A! 4 voti positivi su 5."
}
```

**Prompt strategy:** logica in gran parte deterministica (calcolo maggioranza), l'AI qui serve principalmente per: (a) generare il messaggio di annuncio naturale e contestuale, (b) gestire tie-break con criteri secondari (es. prezzo più basso, rating più alto) in modo trasparente e spiegabile al gruppo.

---

## 8. API Esterne (V2+)

| API | A cosa serve | Quando si usa |
|---|---|---|
| **Amadeus / Duffel** | Ricerca e booking voli | V3 — quando si introduce prenotazione diretta in-app |
| **Booking.com / Expedia (partner API)** | Ricerca e booking hotel, affiliate commission | V3 — booking alloggi |
| **Viator / GetYourGuide** | Prenotazione esperienze/tour locali | V3 — monetizzazione su attività |
| **Mapbox** | Mappe dark-theme, geocoding, routing tra attività | V1 (geocoding base) -> V4 (Party Radar completo) |
| **OpenWeather** | Meteo previsionale per i giorni di viaggio, mostrato in Itinerary | V2 — arricchimento dashboard |
| **Stripe** | Pagamenti in-app (subscription premium, eventuali split payment reali) | V2 (subscription) -> V3 (payment su booking) |
| **Google Places** | Dati reali su ristoranti/locali (rating, orari, foto) per Activity Recommender AI | V2 — per rendere le raccomandazioni AI verificabili e non allucinate |

---

## 9. MVP — Versione 1

### 9.1 Incluso (obbligatorio)
- Login (Google / Apple / Email magic link)
- Onboarding 3 step
- Creazione viaggio via chat guidata AI (Trip Generator AI attivo)
- Gestione gruppo (inviti, membri, ruoli)
- Budget condiviso con split spese e calcolo saldi
- Chat di viaggio con system feed integrato
- Voting system (swipe) per decisioni di gruppo
- Checklist condivisa/personale
- Trip Dashboard (itinerario + tab integrati)

### 9.2 Escluso da V1 (esplicitamente)
- Booking voli
- Booking hotel
- Mappe avanzate / routing real-time
- Party Radar
- Social feed pubblico

### 9.3 Definition of Done MVP
Un gruppo di 3-8 amici può: creare un viaggio via AI in meno di 2 minuti di input, invitare tutti i membri, tracciare ogni spesa con saldo sempre corretto, prendere almeno una decisione di gruppo via voting, e arrivare al giorno del viaggio con un itinerario chiaro — senza uscire mai dall'app.

---

## 10. Roadmap Versioni

### V1 — MVP (mesi 0-3)
Focus: validare che il gruppo adotti TRIBE come hub unico. Tutto il set descritto in §9.1. AI limitata a Trip Generator (le altre 3 AI possono partire in versione semplificata regole+LLM leggero).

### V2 — AI completa + miglior UX (mesi 3-6)
- Attivazione piena di Budget Optimizer AI, Activity Recommender AI, Group Decision AI
- Integrazione Google Places + OpenWeather
- Subscription premium (Stripe)
- Miglioramenti performance, animazioni, dark-mode refinement
- Analytics avanzati (PostHog) per ottimizzare funnel

### V3 — Integrazione booking (mesi 6-10)
- Booking voli (Amadeus/Duffel)
- Booking hotel (Booking/Expedia)
- Booking esperienze (Viator/GetYourGuide)
- Modello a commissione attivo
- Wallet di gruppo per pagamenti condivisi reali

### V4 — Live Travel OS + Party Radar + Social Layer (mesi 10-14)
- Party Radar / Map Events in tempo reale
- Layer sociale leggero (scoperta gruppi/eventi, non feed pubblico invasivo)
- Replay viaggio arricchito (timeline foto/momenti condivisi, stile "wrapped")
- Espansione mercati oltre EU

---

## 11. Business Model

### 11.1 Freemium
**Free:** creazione viaggi illimitata, gruppo fino a 8 membri, 1 rigenerazione AI itinerario/viaggio, budget tracker completo, voting e chat illimitati.

**Premium (3–6€/mese o 25–40€/anno):**
- Rigenerazioni AI illimitate
- Gruppi fino a 20 membri
- Export PDF itinerario/riepilogo spese
- Priorità su Activity Recommender AI (raccomandazioni più profonde/personalizzate)
- Personalizzazione temi/badge app

### 11.2 Commissioni (da V3)
- **Hotel**: 4-8% commissione da programmi affiliate Booking/Expedia
- **Voli**: fee fissa per booking o commissione da Duffel/Amadeus (tipicamente 1-3%)
- **Esperienze**: 8-15% commissione standard da Viator/GetYourGuide affiliate program

### 11.3 Metriche chiave da monitorare
- **Attivazione**: % utenti che completano un viaggio creato entro 7gg da signup
- **Viralità**: numero medio di inviti accettati per viaggio creato (k-factor)
- **Retention di gruppo**: % gruppi che creano un secondo viaggio insieme entro 12 mesi
- **AI trust score**: % di attività generate da AI confermate senza modifiche manuali

---

## 12. Visione Prodotto — Chiusura

> **TRIBE non è un'app di viaggi. È il sistema operativo per il viaggio di gruppo.**

Elimina tre fonti di attrito che oggi nessuno strumento risolve insieme:
1. **Caos organizzativo** — un solo posto invece di 5-7 app/tool
2. **Decisioni manuali infinite** — voting system che trasforma il dibattito in uno swipe
3. **Frammentazione tra app** — chat, soldi, itinerario, checklist: tutto sincronizzato, sempre coerente

Il prodotto vince se, tra due anni, "creare un viaggio con gli amici" significhi di default "apri TRIBE" — non "apri un gruppo Whatsapp e speri che qualcuno faccia l'Excel".

---

**Fine documento.** Pronto per handoff a team engineering (backend/frontend), design (Figma da questa spec) e come base per investor deck (sezioni 0, 1, 9, 10, 11, 12).
