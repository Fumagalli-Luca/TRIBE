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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate(): string | null {
    if (!firstName.trim()) return 'Inserisci il tuo nome.';
    if (!lastName.trim()) return 'Inserisci il tuo cognome.';
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

    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹ Indietro</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crea il tuo account</Text>
          <Text style={styles.subtitle}>Il travel OS per gruppi di amici.</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Nome"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={firstName}
              onChangeText={setFirstName}
            />
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Cognome"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={lastName}
              onChangeText={setLastName}
            />
          </View>
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

          <Text style={styles.hint}>
            Dopo la registrazione ti chiederemo altri dettagli (città, data di nascita, foto
            profilo) per completare il tuo profilo.
          </Text>
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
    gap: spacing.lg,
  },
  backText: { ...typography.body, color: colors.accent },
  header: { gap: spacing.xs },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  form: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flexInput: { flex: 1 },
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
  hint: { ...typography.caption, color: colors.textMuted, textAlign: 'center' },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
