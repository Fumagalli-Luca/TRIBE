import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Legal'>;

const TERMS = `Ultimo aggiornamento: 2026

Benvenuto su TRIBE. Utilizzando l'app accetti questi termini di servizio.

1. Descrizione del servizio
TRIBE è un'applicazione per la pianificazione di viaggi di gruppo: itinerari, budget condiviso, chat e votazioni tra i membri di un viaggio.

2. Account
Sei responsabile della riservatezza delle tue credenziali e di tutte le attività svolte dal tuo account.

3. Contenuti generati dagli utenti
Chat, foto e itinerari condivisi restano visibili ai soli membri del viaggio a cui appartengono. Non pubblicare contenuti illegali, offensivi o che violino diritti di terzi.

4. Funzionalità AI
Alcune funzionalità (es. generazione itinerario) utilizzano modelli di intelligenza artificiale di terze parti. I risultati sono suggerimenti e non garanzie di disponibilità, prezzo o accuratezza.

5. Limitazione di responsabilità
TRIBE è fornito "così com'è". Non garantiamo continuità del servizio o assenza di errori.

6. Modifiche
Questi termini possono essere aggiornati; l'uso continuato dell'app dopo una modifica costituisce accettazione.

7. Contatti
Per domande su questi termini scrivi a l.fumagalli13@gmail.com.`;

const PRIVACY = `Ultimo aggiornamento: 2026

Questa informativa descrive come TRIBE tratta i tuoi dati personali.

1. Dati raccolti
- Dati account: nome, email, foto profilo, città (facoltativa)
- Dati di viaggio: itinerari, spese, messaggi chat, voti, checklist condivise con il tuo gruppo
- Token push per l'invio di notifiche (facoltativo, revocabile disattivando i permessi)

2. Finalità del trattamento
I dati sono usati esclusivamente per far funzionare le funzionalità dell'app (autenticazione, sincronizzazione tra membri del gruppo, notifiche) e non vengono venduti a terzi.

3. Condivisione con terzi
- Supabase: hosting di database, autenticazione e storage file
- Provider email transazionale: invio email di verifica/reset password
- Provider AI (es. OpenAI): solo per la generazione itinerario, riceve i parametri di viaggio inseriti (destinazione, date, budget, preferenze), non altri dati personali

4. Conservazione
I dati restano finché il tuo account o il viaggio non vengono eliminati. Puoi richiedere la cancellazione completa del tuo account in qualsiasi momento.

5. I tuoi diritti
Puoi accedere, correggere o richiedere la cancellazione dei tuoi dati contattando l.fumagalli13@gmail.com.

6. Sicurezza
I dati sono protetti da autenticazione e regole di accesso (Row Level Security) che limitano la visibilità ai soli membri autorizzati di ciascun viaggio.`;

export default function LegalScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { kind } = route.params;
  const title = kind === 'terms' ? 'Termini di servizio' : 'Privacy Policy';
  const body = kind === 'terms' ? TERMS : PRIVACY;

  return (
    <View style={styles.flex}>
      <View style={[styles.headerRow, { paddingTop: insets.top + spacing.md }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  body: { ...typography.body, color: colors.textMuted, lineHeight: 22 },
});
