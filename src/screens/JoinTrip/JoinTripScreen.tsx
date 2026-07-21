import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'JoinTrip'>;

interface FoundTrip {
  id: string;
  name: string;
  destination: string;
}

export default function JoinTripScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [foundTrip, setFoundTrip] = useState<FoundTrip | null>(null);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!code.trim()) return;
    setError(null);
    setFoundTrip(null);
    setLoading(true);

    const { data, error: rpcError } = await supabase.rpc('find_trip_by_invite_code', {
      p_code: code.trim(),
    });

    setLoading(false);

    if (rpcError || !data || data.length === 0) {
      setError('Nessun viaggio trovato con questo codice. Controlla di averlo copiato bene.');
      return;
    }

    setFoundTrip(data[0] as FoundTrip);
  }

  async function handleJoin() {
    if (!foundTrip) return;
    setJoining(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setJoining(false);
      return;
    }

    const { error: joinError } = await supabase.from('trip_members').insert({
      trip_id: foundTrip.id,
      user_id: user.id,
      role: 'member',
      status: 'accepted',
      joined_at: new Date().toISOString(),
    });

    setJoining(false);

    if (joinError) {
      if (joinError.message.toLowerCase().includes('duplicate')) {
        setError('Fai già parte di questo viaggio.');
      } else {
        setError('Non siamo riusciti a unirti al viaggio. Riprova.');
      }
      return;
    }

    navigation.replace('TripOverview', { tripId: foundTrip.id });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Unisciti a un viaggio</Text>
          <View style={{ width: 24 }} />
        </View>

        <Text style={styles.subtitle}>
          Chiedi il codice a chi ha creato il viaggio e inseriscilo qui sotto.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Codice invito (es. AB13CD)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="characters"
          maxLength={6}
          value={code}
          onChangeText={(text) => {
            setCode(text.toUpperCase());
            setFoundTrip(null);
          }}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}

        {foundTrip && (
          <View style={styles.foundCard}>
            <Text style={styles.foundName}>{foundTrip.name}</Text>
            <Text style={styles.foundDestination}>{foundTrip.destination}</Text>
          </View>
        )}

        {foundTrip ? (
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleJoin} disabled={joining}>
            {joining ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Unisciti al viaggio</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.buttonPrimary} onPress={handleSearch} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Cerca viaggio</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
    letterSpacing: 4,
    fontWeight: '700',
  },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  foundCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  foundName: { ...typography.h2, color: colors.text },
  foundDestination: { ...typography.caption, color: colors.textMuted },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: { ...typography.body, fontWeight: '600', color: colors.text },
});
