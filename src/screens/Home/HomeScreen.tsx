import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
        <Text style={styles.emptySubtitle}>
          Crea il tuo primo viaggio e lascia che l'AI costruisca l'itinerario per te.
        </Text>
        <TouchableOpacity style={styles.cta}>
          <Text style={styles.ctaText}>Crea il tuo primo viaggio</Text>
        </TouchableOpacity>
      </View>

      {/* Temporaneo, da rimuovere quando il flow di navigazione sarà completo */}
      <TouchableOpacity style={styles.logout} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Esci</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h1,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  logout: {
    position: 'absolute',
    bottom: spacing.xl,
    alignSelf: 'center',
  },
  logoutText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
