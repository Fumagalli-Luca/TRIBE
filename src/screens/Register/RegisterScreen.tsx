import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { translateAuthError } from '../../lib/authErrors';
import CityAutocomplete from '../../components/CityAutocomplete';
import AnimatedBackground from '../../components/AnimatedBackground';
import PressableScale from '../../components/PressableScale';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Serve il permesso di accesso alle foto per aggiungere un\'immagine profilo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
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

    // I campi extra (foto, città, provincia, CAP, data di nascita) non
    // possono essere scritti ora: prima della conferma email non esiste
    // ancora una sessione autenticata, quindi le policy RLS bloccherebbero
    // la scrittura. Li passiamo a VerifyEmail, che li salva subito dopo
    // aver stabilito la sessione.
    navigation.replace('VerifyEmail', {
      email: email.trim(),
      mode: 'signup',
      pendingProfile: {
        avatarUri,
        city: city.trim() || null,
        province: province.trim() || null,
        postalCode: postalCode.trim() || null,
        birthDate: birthDate ? birthDate.toISOString().split('T')[0] : null,
      },
    });
  }

  return (
    <View style={styles.flex}>
      <AnimatedBackground />
      <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backText}>‹ Indietro</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Crea il tuo account</Text>
          <Text style={styles.subtitle}>Il travel OS per gruppi di amici.</Text>
        </View>

        <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholder}>+ Foto</Text>
          )}
        </TouchableOpacity>

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

          <TouchableOpacity
            style={styles.input}
            onPress={() => {
              Keyboard.dismiss();
              setShowDatePicker(true);
            }}
          >
            <Text style={birthDate ? styles.inputText : styles.inputPlaceholder}>
              {birthDate ? formatDateLabel(birthDate) : 'Data di nascita'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <View style={styles.datePickerBlock}>
              <DateTimePicker
                value={birthDate ?? new Date(2000, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                themeVariant="dark"
                onChange={(_, selected) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (selected) setBirthDate(selected);
                }}
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.datePickerConfirm}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerConfirmText}>Fatto</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <CityAutocomplete
            value={city}
            onChangeText={setCity}
            onSelect={(selection) => {
              setCity(selection.city);
              setProvince(selection.province);
              setPostalCode(selection.postalCode);
            }}
            placeholder="Città"
          />

          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="Provincia"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={2}
              value={province}
              onChangeText={setProvince}
            />
            <TextInput
              style={[styles.input, styles.flexInput]}
              placeholder="CAP"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={5}
              value={postalCode}
              onChangeText={setPostalCode}
            />
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <PressableScale style={styles.buttonPrimary} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.buttonPrimaryText}>Crea account</Text>
            )}
          </PressableScale>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  backButton: { paddingVertical: spacing.xs, alignSelf: 'flex-start' },
  backText: { ...typography.body, color: colors.accent },
  header: { gap: spacing.xs, marginBottom: spacing.sm },
  title: { ...typography.display, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted },
  avatarPicker: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88 },
  avatarPlaceholder: { ...typography.caption, color: colors.accent },
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
    justifyContent: 'center',
  },
  inputText: { ...typography.body, color: colors.text },
  inputPlaceholder: { ...typography.body, color: colors.textMuted },
  datePickerBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  datePickerConfirm: {
    backgroundColor: colors.primary,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerConfirmText: { ...typography.body, fontWeight: '600', color: colors.text },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimaryText: { ...typography.body, fontWeight: '600', color: colors.text },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
