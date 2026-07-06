import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Step = 'email' | 'code';

const redirectTo = makeRedirectUri({ scheme: 'tribeapp' });
const RESEND_COOLDOWN_SECONDS = 60;

function translateAuthError(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('rate limit')) {
    return 'Hai richiesto troppi codici in poco tempo. Aspetta qualche minuto e riprova.';
  }
  if (normalized.includes('invalid') && normalized.includes('otp')) {
    return 'Codice non valido o scaduto. Controlla di averlo copiato bene o richiedine uno nuovo.';
  }
  if (normalized.includes('token has expired')) {
    return 'Il codice è scaduto. Richiedine uno nuovo.';
  }
  if (normalized.includes('email') && normalized.includes('invalid')) {
    return "L'indirizzo email non sembra valido.";
  }
  if (normalized.includes('network')) {
    return 'Problema di connessione. Controlla la rete e riprova.';
  }
  return message;
}

async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const access_token = queryParams?.access_token as string | undefined;
  const refresh_token = queryParams?.refresh_token as string | undefined;
  if (!access_token || !refresh_token) return;
  await supabase.auth.setSession({ access_token, refresh_token });
}

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSendCode() {
    if (!email.trim() || cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setStep('code');
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleVerifyCode() {
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    });
    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
    }
    // Se non c'è errore, il listener onAuthStateChange in RootNavigator
    // rileva la sessione e naviga automaticamente verso Home.
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    setError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error || !data?.url) {
      setError(
        error
          ? translateAuthError(error.message)
          : `Provider ${provider} non ancora configurato in Supabase (Authentication → Providers).`
      );
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success' && result.url) {
      await createSessionFromUrl(result.url);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>
            Benvenuto in{'\n'}
            <Text style={styles.titleAccent}>TRIBE</Text>
          </Text>
          <Text style={styles.subtitle}>Il travel OS per gruppi di amici.</Text>
        </View>

        <View style={styles.form}>
          <TouchableOpacity style={styles.oauthButton} onPress={() => handleOAuth('google')}>
            <View style={[styles.oauthIcon, { backgroundColor: '#EA4335' }]}>
              <Text style={styles.oauthIconText}>G</Text>
            </View>
            <Text style={styles.oauthButtonText}>Continua con Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.oauthButton} onPress={() => handleOAuth('apple')}>
            <View style={[styles.oauthIcon, { backgroundColor: colors.text }]}>
              <Text style={[styles.oauthIconText, { color: colors.background }]}></Text>
            </View>
            <Text style={styles.oauthButtonText}>Continua con Apple</Text>
          </TouchableOpacity>

          <Text style={styles.divider}>oppure</Text>

          {step === 'email' ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="La tua email"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <TouchableOpacity
                style={[styles.buttonPrimary, cooldown > 0 && styles.buttonDisabled]}
                onPress={handleSendCode}
                disabled={loading || cooldown > 0}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>
                    {cooldown > 0 ? `Riprova tra ${cooldown}s` : 'Continua con email'}
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Ti abbiamo inviato un codice a {email.trim()}. Inseriscilo qui sotto.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Codice a 6 cifre"
                placeholderTextColor={colors.textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
              <TouchableOpacity
                style={styles.buttonPrimary}
                onPress={handleVerifyCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.text} />
                ) : (
                  <Text style={styles.buttonPrimaryText}>Verifica codice</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('email')}>
                <Text style={styles.linkText}>Usa un'altra email</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSendCode} disabled={cooldown > 0 || loading}>
                <Text style={[styles.linkText, cooldown > 0 && styles.linkTextDisabled]}>
                  {cooldown > 0 ? `Rinvia codice tra ${cooldown}s` : 'Rinvia codice'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <Text style={styles.terms}>
          Continuando accetti i{' '}
          <Text style={styles.termsLink}>Termini di servizio</Text> e la{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: colors.text,
  },
  titleAccent: {
    color: colors.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.text,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  oauthIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthIconText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  oauthButtonText: {
    ...typography.body,
    color: '#111114',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  divider: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPrimaryText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  linkText: {
    ...typography.caption,
    color: colors.accent,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  linkTextDisabled: {
    color: colors.textMuted,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
  terms: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  termsLink: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
});
