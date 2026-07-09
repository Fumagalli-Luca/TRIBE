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
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const redirectTo = makeRedirectUri({ scheme: 'tribeapp' });

async function createSessionFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  const access_token = queryParams?.access_token as string | undefined;
  const refresh_token = queryParams?.refresh_token as string | undefined;
  if (!access_token || !refresh_token) return;
  await supabase.auth.setSession({ access_token, refresh_token });
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        await supabase.auth.resend({ type: 'signup', email: email.trim() });
        navigation.replace('VerifyEmail', { email: email.trim(), mode: 'reconfirm' });
        return;
      }
      setError(translateAuthError(error.message));
      return;
    }
    // Sessione creata: RootNavigator la rileva da solo e naviga.
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
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>
            Bentornato in{'\n'}
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

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Accedi</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Register')}>
            <Text style={styles.linkText}>Non hai un account? Registrati</Text>
          </TouchableOpacity>
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
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.lg,
  },
  header: { marginBottom: spacing.xl },
  title: { ...typography.display, color: colors.text },
  titleAccent: { color: colors.primary },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  form: { gap: spacing.md },
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
  oauthIconText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  oauthButtonText: {
    ...typography.body,
    color: '#111114',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 24,
  },
  divider: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
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
  buttonPrimaryText: { ...typography.body, fontWeight: '600', color: colors.text },
  linkText: { ...typography.caption, color: colors.accent, textAlign: 'center' },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  terms: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  termsLink: { color: colors.accent, textDecorationLine: 'underline' },
});
