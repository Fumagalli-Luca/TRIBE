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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!fullName.trim()) return 'Inserisci il tuo nome.';
    if (!email.trim() || !email.includes('@')) return "L'email non sembra valida.";
    if (password.length < 6) return 'La password deve avere almeno 6 caratteri.';
    if (password !== confirmPassword) return 'Le password non coincidono.';
    return null;
  }

  async function handleRegister() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
      },
    });

    setLoading(false);

    if (error) {
      setError(translateAuthError(error.message));
      return;
    }

    navigation.replace('VerifyEmail', { email: email.trim(), mode: 'signup' });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Crea il tuo account</Text>
          <Text style={styles.subtitle}>Il travel OS per gruppi di amici.</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nome e cognome"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
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
          <TextInput
            style={styles.input}
            placeholder="Conferma password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.buttonPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Crea account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.linkText}>Hai già un account? Accedi</Text>
          </TouchableOpacity>
        </View>
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
    gap: spacing.xl,
  },
  header: { gap: spacing.xs },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { gap: spacing.md },
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
});
