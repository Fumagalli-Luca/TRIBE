import { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface TripSummary {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
}

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
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAll);
    loadAll();
    return unsubscribe;
  }, [navigation]);

  async function loadAll() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const fullName = user.user_metadata?.full_name as string | undefined;
    setDisplayName(fullName?.split(' ')[0]);
    setInitials(initialsFrom(fullName, user.email));

    const { data: profileData } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single();
    setAvatarUrl((profileData as { avatar_url: string | null } | null)?.avatar_url ?? null);

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('trip:trips(id, name, destination, start_date, end_date, cover_image_url)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const tripList = ((memberRows as unknown as { trip: TripSummary | null }[]) ?? [])
      .map((row) => row.trip)
      .filter((t): t is TripSummary => t !== null)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    setTrips(tripList);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.greeting}>{displayName ? `Ciao, ${displayName} 👋` : 'Ciao 👋'}</Text>
        <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </TouchableOpacity>
      </View>

      {!loading && trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
          <Text style={styles.emptySubtitle}>
            Crea il tuo primo viaggio e lascia che l'AI costruisca l'itinerario per te.
          </Text>
          <TouchableOpacity style={styles.cta} onPress={() => navigation.navigate('CreateTrip')}>
            <Text style={styles.ctaText}>Crea il tuo primo viaggio</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ctaSecondary} onPress={() => navigation.navigate('JoinTrip')}>
            <Text style={styles.ctaSecondaryText}>Ho un codice invito</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.tripList}>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateTrip')}>
              <Text style={styles.actionButtonText}>+ Nuovo viaggio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={() => navigation.navigate('JoinTrip')}
            >
              <Text style={styles.actionButtonOutlineText}>Ho un invito</Text>
            </TouchableOpacity>
          </View>

          {trips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => navigation.navigate('TripOverview', { tripId: trip.id })}
            >
              <Text style={styles.tripName}>{trip.name}</Text>
              <Text style={styles.tripDates}>
                {trip.start_date} — {trip.end_date}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: { ...typography.h2, color: colors.text },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { ...typography.body, fontWeight: '700', color: colors.text },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  emptyTitle: { ...typography.h1, color: colors.text },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 52,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaText: { ...typography.body, fontWeight: '600', color: colors.text },
  ctaSecondary: { marginTop: spacing.sm },
  ctaSecondaryText: { ...typography.body, color: colors.accent },
  tripList: { padding: spacing.lg, gap: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  actionButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { ...typography.caption, fontWeight: '600', color: colors.text },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionButtonOutlineText: { ...typography.caption, fontWeight: '600', color: colors.primary },
  tripCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 4,
  },
  tripName: { ...typography.h2, color: colors.text },
  tripDates: { ...typography.caption, color: colors.textMuted },
});
