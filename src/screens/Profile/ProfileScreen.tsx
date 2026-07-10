import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { supabase } from '../../lib/supabase';
import { isBiometricAvailable } from '../../lib/biometrics';
import { getBiometricEnabled, setBiometricEnabled } from '../../lib/biometricPreference';
import CityAutocomplete from '../../components/CityAutocomplete';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  email: string;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricOn, setBiometricOn] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadProfile();
    isBiometricAvailable().then(setBiometricSupported);
    getBiometricEnabled().then(setBiometricOn);
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
      .select('first_name, last_name, city, province, postal_code, birth_date, avatar_url, email')
      .eq('id', user.id)
      .single();

    const p = data as ProfileData | null;
    if (p) {
      setProfile(p);
      setFirstName(p.first_name ?? '');
      setLastName(p.last_name ?? '');
      setCity(p.city ?? '');
      setProvince(p.province ?? '');
      setPostalCode(p.postal_code ?? '');
    }
    setLoading(false);
  }

  async function handlePickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Serve il permesso di accesso alle foto per cambiare immagine profilo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !userId) return;

    setUploadingAvatar(true);
    setError(null);

    try {
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const path = `${userId}/avatar.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: avatarUrl } : prev));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore sconosciuto';
      setError(`Non siamo riusciti a caricare la foto (${message}).`);
    } finally {
      setUploadingAvatar(false);
    }
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
      setError(`Non siamo riusciti a salvare le modifiche (${updateError.message}).`);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleToggleBiometric(value: boolean) {
    setBiometricOn(value);
    await setBiometricEnabled(value);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
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
          <Text style={styles.headerTitle}>Profilo</Text>
          <View style={{ width: 24 }} />
        </View>

        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <ActivityIndicator color={colors.text} />
          ) : profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarPlaceholderText}>
              {firstName ? firstName[0].toUpperCase() : '?'}
            </Text>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditBadgeText}>✎</Text>
          </View>
        </TouchableOpacity>

        {error && <Text style={styles.errorText}>{error}</Text>}
        {saved && <Text style={styles.savedText}>Salvato ✓</Text>}

        <Section title="Informazioni personali">
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

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.saveButtonText}>Salva modifiche</Text>
            )}
          </TouchableOpacity>
        </Section>

        <Section title="Account">
          <Text style={styles.label}>Email</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{profile?.email}</Text>
          </View>
        </Section>

        {biometricSupported && (
          <Section title="Sicurezza">
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Accedi con Face ID / Touch ID</Text>
              <Switch
                value={biometricOn}
                onValueChange={handleToggleBiometric}
                trackColor={{ false: colors.border, true: colors.primary }}
              />
            </View>
          </Section>
        )}

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Esci</Text>
        </TouchableOpacity>
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
  container: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  avatarWrapper: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholderText: { ...typography.display, color: colors.text },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarEditBadgeText: { fontSize: 13, color: colors.background },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
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
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  inputDisabled: { opacity: 0.6 },
  inputDisabledText: { ...typography.body, color: colors.textMuted },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: { ...typography.body, color: colors.text, flex: 1, marginRight: spacing.sm },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
  savedText: { ...typography.caption, color: colors.success, textAlign: 'center' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  signOutButton: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  signOutText: { ...typography.body, color: colors.danger },
});
