import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

function initialsFrom(name: string | undefined, email: string | undefined): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export default function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [initials, setInitials] = useState('?');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const fullName = user.user_metadata?.full_name as string | undefined;
    setDisplayName(fullName?.split(' ')[0]);
    setInitials(initialsFrom(fullName, user.email));

    const { data } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    setAvatarUrl((data as { avatar_url: string | null } | null)?.avatar_url ?? null);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.greeting}>{displayName ? `Ciao, ${displayName} 👋` : 'Ciao 👋'}</Text>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => navigation.navigate('Profile')}
        >
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.emptyState}>
        <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
        <Text style={styles.emptySubtitle}>
          Crea il tuo primo viaggio e lascia che l'AI costruisca l'itinerario per te.
        </Text>
        <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('CreateTrip')}>
          <Text style={styles.ctaText}>Crea il tuo primo viaggio</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    ...typography.h2,
    color: colors.text,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
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
});
