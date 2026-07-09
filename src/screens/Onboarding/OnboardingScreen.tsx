import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    title: 'Il tuo gruppo,\nun solo posto',
    subtitle: 'Chat, itinerario, budget e checklist. Tutto sincronizzato.',
  },
  {
    title: "L'AI crea\nl'itinerario",
    subtitle: 'Dì dove, quando e con che budget. Pensa il resto TRIBE.',
  },
  {
    title: 'Decidete\ninsieme',
    subtitle: 'Votate hotel e attività, dividete le spese senza discussioni.',
  },
];

type Step = number | 'profile'; // 0..2 = slide, 'profile' = raccolta nome

export default function OnboardingScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function goNext() {
    if (typeof step === 'number' && step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      setStep('profile');
    }
  }

  async function handleSaveProfile() {
    if (!fullName.trim()) return;
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      setError('Sessione non valida, riprova ad accedere.');
      return;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ full_name: fullName.trim(), onboarding_completed: true })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  }

  if (step === 'profile') {
    return (
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.profileContainer}>
          <View>
            <Text style={styles.profileTitle}>Come ti chiami?</Text>
            <Text style={styles.profileSubtitle}>
              Così il tuo gruppo saprà sempre chi sei nei viaggi.
            </Text>
          </View>

          <View style={styles.profileForm}>
            <TextInput
              style={styles.input}
              placeholder="Nome e cognome"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={fullName}
              onChangeText={setFullName}
            />
            <TouchableOpacity
              style={[styles.primaryButton, !fullName.trim() && styles.buttonDisabled]}
              onPress={handleSaveProfile}
              disabled={saving || !fullName.trim()}
            >
              {saving ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={styles.primaryButtonText}>Entra in TRIBE</Text>
              )}
            </TouchableOpacity>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  const slide = SLIDES[step];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => setStep('profile')}
      >
        <Text style={styles.skipText}>Salta</Text>
      </TouchableOpacity>

      <View style={styles.slideBody}>
        <View style={styles.illustration} />
        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === step && styles.dotActive]}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={goNext}>
          <Text style={styles.primaryButtonText}>
            {step === SLIDES.length - 1 ? 'Iniziamo' : 'Avanti'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  skipButton: { alignSelf: 'flex-end', marginTop: spacing.md },
  skipText: { ...typography.body, color: colors.textMuted },
  slideBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  illustration: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slideTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },
  slideSubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  footer: { gap: spacing.lg, paddingBottom: spacing.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 20,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  primaryButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  profileContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'space-between',
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  profileTitle: { ...typography.display, color: colors.text },
  profileSubtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  profileForm: { gap: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.md,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  errorText: { ...typography.caption, color: colors.danger, textAlign: 'center' },
});
