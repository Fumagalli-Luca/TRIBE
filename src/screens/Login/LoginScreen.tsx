import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Step = 'email' | 'code';

const redirectTo = makeRedirectUri({ scheme: 'tribeapp' });

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

  async function handleSendCode() {
    if (!email.trim()) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setStep('code');
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
      setError(error.message);
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
        error?.message ??
          `Provider ${provider} non ancora configurato in Supabase (Authentication → Providers).`
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
        <Text style={styles.title}>Bentornato su TRIBE</Text>

        <TouchableOpacity style={styles.buttonSecondary} onPress={() => handleOAuth('google')}>
          <Text style={styles.buttonSecondaryText}>Continua con Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonSecondary} onPress={() => handleOAuth('apple')}>
          <Text style={styles.buttonSecondaryText}>Continua con Apple</Text>
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
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleSendCode} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonPrimaryText}>Continua con email</Text>
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
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleVerifyCode} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonPrimaryText}>Verifica codice</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('email')}>
              <Text style={styles.linkText}>Usa un'altra email</Text>
            </TouchableOpacity>
          </>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
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
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    ...typography.body,
    color: colors.accent,
  },
  divider: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginVertical: spacing.sm,
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
  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
  },
});
