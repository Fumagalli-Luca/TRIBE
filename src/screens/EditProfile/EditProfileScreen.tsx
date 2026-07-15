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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import CityAutocomplete from '../../components/CityAutocomplete';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    setUserId(user.id);

    const { data } = await supabase
      .from('users')
      .select('first_name, last_name, city, province, postal_code')
      .eq('id', user.id)
      .single();

    if (data) {
      const p = data as {
        first_name: string | null;
        last_name: string | null;
        city: string | null;
        province: string | null;
        postal_code: string | null;
      };
      setFirstName(p.first_name ?? '');
      setLastName(p.last_name ?? '');
      setCity(p.city ?? '');
      setProvince(p.province ?? '');
      setPostalCode(p.postal_code ?? '');
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from('users')
      .update({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        city: city.trim() || null,
        province: province.trim() || null,
        postal_code: postalCode.trim() || null,
      })
      .eq('id', userId);

    setSaving(false);

    if (updateError) {
      setError(`Non siamo riusciti a salvare (${updateError.message}).`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Informazioni personali</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Nome</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Nome"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Cognome</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Cognome"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>Città</Text>
          <CityAutocomplete
            value={city}
            onChangeText={setCity}
            onSelect={(selection) => {
              setCity(selection.city);
              setProvince(selection.province);
              setPostalCode(selection.postalCode);
            }}
          />

          <View style={styles.row}>
            <View style={styles.flexInput}>
              <Text style={styles.label}>Provincia</Text>
              <TextInput
                style={styles.input}
                value={province}
                onChangeText={setProvince}
                autoCapitalize="characters"
                maxLength={2}
                placeholderTextColor={colors.textMuted}
              />
            </View>
            <View style={styles.flexInput}>
              <Text style={styles.label}>CAP</Text>
              <TextInput
                style={styles.input}
                value={postalCode}
                onChangeText={setPostalCode}
                keyboardType="number-pad"
                maxLength={5}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}
          {saved && <Text style={styles.savedText}>Salvato ✓</Text>}

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.saveButtonText}>Salva modifiche</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  form: { gap: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm, marginBottom: 4 },
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
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
  savedText: { ...typography.caption, color: colors.success, textAlign: 'center', marginTop: spacing.sm },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  saveButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
});
