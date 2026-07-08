import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'AILoading'>;

const ROTATING_MESSAGES = [
  'Sto cercando i posti migliori...',
  'Costruisco l\'itinerario...',
  'Ottimizzo il budget...',
  'Ultimi ritocchi...',
];

const ROTATE_INTERVAL_MS = 1800;
const TIMEOUT_MS = 12000;

export default function AILoadingScreen({ route, navigation }: Props) {
  const { payload } = route.params;
  const [messageIndex, setMessageIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const startedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % ROTATING_MESSAGES.length);
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    generateTrip();
  }, []);

  async function generateTrip() {
    setStatus('loading');
    startedRef.current = true;

    const timeoutPromise = new Promise<'timeout'>((resolve) =>
      setTimeout(() => resolve('timeout'), TIMEOUT_MS)
    );

    try {
      const invokePromise = supabase.functions.invoke('generate-trip', {
        body: payload,
      });

      const result = await Promise.race([invokePromise, timeoutPromise]);

      if (result === 'timeout') {
        setStatus('error');
        return;
      }

      const { data, error } = result;
      if (error || !data?.trip_id) {
        setStatus('error');
        return;
      }

      navigation.replace('TripOverview', { tripId: data.trip_id });
    } catch {
      setStatus('error');
    }
  }

  function handleRetry() {
    startedRef.current = false;
    generateTrip();
  }

  return (
    <View style={styles.container}>
      <View style={styles.pulseCircle} />
      {status === 'loading' ? (
        <Text style={styles.text}>{ROTATING_MESSAGES[messageIndex]}</Text>
      ) : (
        <>
          <Text style={styles.text}>Ci sta mettendo più del previsto...</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Riprova</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  pulseCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    opacity: 0.85,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  text: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 48,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
});
