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

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyEmail'>;

const RESEND_COOLDOWN_SECONDS = 60;

async function savePendingProfile(
  userId: string,
  pendingProfile: Props['route']['params']['pendingProfile']
) {
  if (!pendingProfile) return;

  let avatarUrl: string | null = null;

  if (pendingProfile.avatarUri) {
    try {
      const response = await fetch(pendingProfile.avatarUri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${userId}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) {
        console.warn('[avatar upload]', uploadError.message);
      } else {
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
      }
    } catch (err) {
      console.warn('[avatar upload] eccezione', err);
    }
  }

  await supabase
    .from('users')
    .update({
      city: pendingProfile.city,
      province: pendingProfile.province,
      postal_code: pendingProfile.postalCode,
      birth_date: pendingProfile.birthDate,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq('id', userId);
}

export default function VerifyEmailScreen({ route }: Props) {
  const { email, mode, pendingProfile } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify() {
    if (!code.trim()) return;
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code.trim(),
      type: 'signup',
    });
    if (error) {
      setLoading(false);
      setError(translateAuthError(error.message));
      return;
    }

    if (data.user && pendingProfile) {
      await savePendingProfile(data.user.id, pendingProfile);
    }

    setLoading(false);
    // Sessione creata: RootNavigator la rileva da solo e naviga.
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError(null);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setError(translateAuthError(error.message));
      return;
    }
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Conferma la tua email</Text>
        <Text style={styles.subtitle}>
          {mode === 'signup'
            ? `Ti abbiamo inviato un codice a ${email} per attivare il tuo account.`
            : `Devi confermare ${email} prima di poter accedere. Ti abbiamo inviato un nuovo codice.`}
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

        {error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleVerify} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <Text style={styles.buttonPrimaryText}>Conferma</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleResend} disabled={cooldown > 0}>
          <Text style={[styles.linkText, cooldown > 0 && styles.linkTextDisabled]}>
            {cooldown > 0 ? `Rinvia codice tra ${cooldown}s` : 'Rinvia codice'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
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
