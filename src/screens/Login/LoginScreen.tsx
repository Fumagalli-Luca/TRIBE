import { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, radius, spacing, typography } from '../../constants/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleMagicLink() {
    if (!email.trim()) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim() });
    setSending(false);
    if (!error) setSent(true);
  }

  // TODO: OAuth Google/Apple — richiede expo-auth-session / expo-apple-authentication
  // configurati con i client ID del progetto Supabase. Placeholder in attesa
  // delle credenziali OAuth (Google Cloud Console / Apple Developer).

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bentornato su TRIBE</Text>

      <TouchableOpacity style={styles.buttonSecondary} disabled>
        <Text style={styles.buttonSecondaryText}>Continua con Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonSecondary} disabled>
        <Text style={styles.buttonSecondaryText}>Continua con Apple</Text>
      </TouchableOpacity>

      <Text style={styles.divider}>oppure</Text>

      <TextInput
        style={styles.input}
        placeholder="La tua email"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.buttonPrimary} onPress={handleMagicLink} disabled={sending}>
        {sending ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonPrimaryText}>Continua con email</Text>
        )}
      </TouchableOpacity>

      {sent && <Text style={styles.hint}>Ti abbiamo inviato un link magico via email.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'flex-end',
    padding: spacing.lg,
    gap: spacing.md,
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
    color: colors.success,
    textAlign: 'center',
  },
});
