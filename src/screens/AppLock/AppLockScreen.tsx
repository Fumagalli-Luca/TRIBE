import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Props {
  onRetry: () => void;
}

export default function AppLockScreen({ onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.title}>TRIBE è bloccato</Text>
      <Text style={styles.subtitle}>Sblocca con Face ID / Touch ID per continuare.</Text>

      <TouchableOpacity style={styles.primaryButton} onPress={onRetry}>
        <Text style={styles.primaryButtonText}>Riprova</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => supabase.auth.signOut()}>
        <Text style={styles.linkText}>Esci dall'account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  icon: { fontSize: 48 },
  title: { ...typography.h1, color: colors.text },
  subtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  primaryButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  linkText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
