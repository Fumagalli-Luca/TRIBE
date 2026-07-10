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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

type Step = 'request' | 'reset';
const RESEND_COOLDOWN_SECONDS = 60;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleRequestCode() {
    if (!email.trim() || cooldown > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setStep('reset');
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleResetPassword() {
    if (!code.trim() || newPassword.length < 6) return;
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }
    setError(null);
    setLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'recovery',
    });

    if (verifyError) {
      setLoading(false);
      setError(translateAuthError(verifyError.message));
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (updateError) {
      setError(translateAuthError(updateError.message));
      return;
    }

    // Sessione di recovery attiva: RootNavigator porta l'utente dentro l'app.
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backText}>‹ Indietro</Text>
        </TouchableOpacity>

        {step === 'request' ? (
          <>
            <Text style={styles.title}>Password dimenticata?</Text>
            <Text style={styles.subtitle}>
              Inserisci la tua email: ti mandiamo un codice per reimpostarla.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity
              style={styles.buttonPrimary}
              onPress={handleRequestCode}
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonPrimaryText}>
                  {cooldown > 0 ? `Riprova tra ${cooldown}s` : 'Invia codice'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Reimposta la password</Text>
            <Text style={styles.subtitle}>Codice inviato a {email.trim()}.</Text>
            <TextInput
              style={styles.input}
              placeholder="Codice a 6 cifre"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TextInput
              style={styles.input}
              placeholder="Nuova password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <TextInput
              style={styles.input}
              placeholder="Conferma nuova password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
            <TouchableOpacity style={styles.buttonPrimary} onPress={handleResetPassword} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.buttonPrimaryText}>Reimposta password</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRequestCode} disabled={cooldown > 0}>
              <Text style={[styles.linkText, cooldown > 0 && styles.linkTextDisabled]}>
                {cooldown > 0 ? `Rinvia codice tra ${cooldown}s` : 'Rinvia codice'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  backText: { ...typography.body, color: colors.accent, marginBottom: spacing.lg },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
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
  linkTextDisabled: { color: colors.textMuted },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
