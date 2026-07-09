import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function OnboardingScreen({ navigation }: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  async function completeOnboarding() {
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

  function handleNext() {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex((i) => i + 1);
    } else {
      completeOnboarding();
    }
  }

  const slide = SLIDES[slideIndex];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipButton} onPress={completeOnboarding} disabled={saving}>
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

      <TouchableOpacity style={styles.primaryButton} onPress={handleNext} disabled={saving}>
        <Text style={styles.primaryButtonText}>
          {slideIndex < SLIDES.length - 1 ? 'Avanti' : 'Iniziamo'}
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
  skipButton: { position: 'absolute', top: spacing.xl, right: spacing.lg },
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
});
