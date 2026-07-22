import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
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
const TIMEOUT_MS = 20000;

async function extractErrorMessage(error: unknown, data: unknown): Promise<string> {
  // La Edge Function risponde con { error: "..." } anche sui codici di
  // errore (400/401/500): supabase-js lo espone come corpo della Response
  // dentro error.context, non come messaggio diretto — va letto a parte.
  const withContext = error as { context?: Response; message?: string } | null;
  if (withContext?.context) {
    try {
      const body = await withContext.context.clone().json();
      if (body?.error) return body.error as string;
    } catch {
      // corpo non JSON, ignora e usa il fallback sotto
    }
  }
  if (withContext?.message) return withContext.message;
  const dataError = (data as { error?: string } | null)?.error;
  if (dataError) return dataError;
  return 'Errore sconosciuto dalla Edge Function generate-trip.';
}

export default function AILoadingScreen({ route, navigation }: Props) {
  const { payload } = route.params;
  const [messageIndex, setMessageIndex] = useState(0);
  const [status, setStatus] = useState<'loading' | 'error' | 'timeout'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
    setErrorMessage(null);
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
        setStatus('timeout');
        return;
      }

      const { data, error } = result;
      if (error || !data?.trip_id) {
        setErrorMessage(await extractErrorMessage(error, data));
        setStatus('error');
        return;
      }

      navigation.replace('TripOverview', { tripId: data.trip_id });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Errore sconosciuto');
      setStatus('error');
    }
  }

  function handleRetry() {
    startedRef.current = false;
    generateTrip();
  }

  const pulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.85);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.85, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: glowOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.pulseCircle, pulseStyle]} />
      {status === 'loading' ? (
        <Text style={styles.text}>{ROTATING_MESSAGES[messageIndex]}</Text>
      ) : (
        <>
          <Text style={styles.text}>
            {status === 'timeout' ? 'Ci sta mettendo più del previsto...' : 'Non siamo riusciti a generare il viaggio.'}
          </Text>
          {errorMessage && <Text style={styles.errorDetail}>{errorMessage}</Text>}
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
  errorDetail: {
    ...typography.caption,
    color: colors.danger,
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
