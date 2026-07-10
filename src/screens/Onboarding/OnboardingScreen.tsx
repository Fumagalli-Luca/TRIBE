import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
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
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    icon: '👥',
    title: 'Il tuo gruppo,\nun solo posto',
    subtitle: 'Chat, itinerario, budget e checklist. Tutto sincronizzato.',
  },
  {
    icon: '✨',
    title: "L'AI crea\nl'itinerario",
    subtitle: 'Dì dove, quando e con che budget. Pensa il resto TRIBE.',
  },
  {
    icon: '🗳️',
    title: 'Decidete\ninsieme',
    subtitle: 'Votate hotel e attività, dividete le spese senza discussioni.',
  },
];

type Step = 'slide' | 'profile';

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('slide');
  const [slideIndex, setSlideIndex] = useState(0);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1);
    } else {
      setStep('profile');
    }
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

  async function completeOnboarding() {
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      return;
    }

    let avatarUrl: string | null = null;

    if (avatarUri) {
      try {
        const response = await fetch(avatarUri);
        const arrayBuffer = await response.arrayBuffer();
        const path = `${user.id}/avatar.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;
        }
      } catch {
        // Se l'upload fallisce non blocchiamo l'onboarding: l'utente potrà
        // aggiungere la foto in un secondo momento dal Profilo.
      }
    }

    await supabase
      .from('users')
      .update({
        birth_date: birthDate ? birthDate.toISOString().split('T')[0] : null,
        city: city.trim() || null,
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        onboarding_completed: true,
      })
      .eq('id', user.id);

    setSaving(false);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  async function skipToHome() {
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id);
    }
    setSaving(false);
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  if (step === 'profile') {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.skipButton} onPress={skipToHome} disabled={saving}>
          <Text style={styles.skipText}>Salta</Text>
        </TouchableOpacity>

        <View style={styles.profileBlock}>
          <Text style={styles.title}>Completa il profilo</Text>
          <Text style={styles.subtitle}>Facoltativo, ma aiuta il gruppo a conoscerti meglio.</Text>

          <TouchableOpacity style={styles.avatarPicker} onPress={handlePickAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarPlaceholder}>+ Foto</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={birthDate ? styles.inputText : styles.inputPlaceholder}>
              {birthDate ? formatDateLabel(birthDate) : 'Data di nascita'}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
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
          )}

          <TextInput
            style={styles.input}
            placeholder="Città"
            placeholderTextColor={colors.textMuted}
            value={city}
            onChangeText={setCity}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={styles.primaryButton} onPress={completeOnboarding} disabled={saving}>
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={styles.primaryButtonText}>Entra in TRIBE</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const slide = SLIDES[slideIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={() => setStep('profile')}>
        <Text style={styles.skipText}>Salta</Text>
      </TouchableOpacity>

      <View style={styles.slideBlock}>
        <Text style={styles.icon}>{slide.icon}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === slideIndex && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext}>
        <Text style={styles.primaryButtonText}>
          {slideIndex < SLIDES.length - 1 ? 'Avanti' : 'Continua'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'flex-end',
  },
  skipButton: { position: 'absolute', top: spacing.xl, right: spacing.lg, zIndex: 1 },
  skipText: { ...typography.body, color: colors.textMuted },
  slideBlock: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  icon: { fontSize: 64, marginBottom: spacing.md },
  title: { ...typography.display, color: colors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.primary, width: 20 },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  profileBlock: { flex: 1, justifyContent: 'center', gap: spacing.md },
  avatarPicker: {
    alignSelf: 'center',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  avatarImage: { width: 96, height: 96 },
  avatarPlaceholder: { ...typography.caption, color: colors.accent },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputText: { ...typography.body, color: colors.text },
  inputPlaceholder: { ...typography.body, color: colors.textMuted },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
