import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell } from 'lucide-react-native';
import type { HomeNavigationProp } from '../../navigation/RootNavigator';
import { colors, gradients, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import Avatar from '../../components/Avatar';
import AvatarStack from '../../components/AvatarStack';
import GradientButton from '../../components/GradientButton';

interface Props {
  navigation: HomeNavigationProp;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
}

interface TripSummary {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
}

interface Member {
  name: string | null;
  avatarUrl: string | null;
}

function classify(trip: TripSummary, today: Date): 'ongoing' | 'upcoming' | 'past' {
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  if (end < today) return 'past';
  if (start <= today) return 'ongoing';
  return 'upcoming';
}

function daysUntil(dateStr: string, today: Date): number {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

function useCountdown(startDate: string) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const diffMs = Math.max(0, new Date(startDate).getTime() - Date.now());
    const totalMinutes = Math.floor(diffMs / 60000);
    return {
      days: Math.floor(totalMinutes / (60 * 24)),
      hours: Math.floor((totalMinutes % (60 * 24)) / 60),
      minutes: totalMinutes % 60,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, tick]);
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.countdownBox}>
      <Text style={styles.countdownValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardTab({ navigation, onOpenNotifications, onOpenProfile }: Props) {
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState<string | undefined>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [heroMembers, setHeroMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadAll);
    loadAll();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const hero =
      tripList.find((t) => classify(t, today) === 'ongoing') ??
      tripList.find((t) => classify(t, today) === 'upcoming') ??
      null;

    if (hero) {
      const { data: rows } = await supabase
        .from('trip_members')
        .select('user:users(full_name, avatar_url)')
        .eq('trip_id', hero.id)
        .eq('status', 'accepted');
      setHeroMembers(
        ((rows as unknown as { user: { full_name: string | null; avatar_url: string | null } | null }[]) ?? [])
          .filter((r) => r.user)
          .map((r) => ({ name: r.user!.full_name, avatarUrl: r.user!.avatar_url }))
      );
    } else {
      setHeroMembers([]);
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const ongoing = trips.filter((t) => classify(t, today) === 'ongoing');
  const upcoming = trips.filter((t) => classify(t, today) === 'upcoming');
  const past = trips.filter((t) => classify(t, today) === 'past');
  const hero = ongoing[0] ?? upcoming[0] ?? null;
  const restUpcoming = hero ? upcoming.filter((t) => t.id !== hero.id) : upcoming;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.greeting}>{displayName ? `Ciao, ${displayName} 👋` : 'Ciao 👋'}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={onOpenNotifications} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Bell size={22} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onOpenProfile}>
            <Avatar name={displayName ?? null} uri={avatarUrl} size={36} />
          </TouchableOpacity>
        </View>
      </View>

      {!loading && trips.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Nessun viaggio ancora</Text>
          <Text style={styles.emptySubtitle}>
            Crea il tuo primo viaggio e lascia che l'AI costruisca l'itinerario per te.
          </Text>
          <GradientButton
            label="Crea il tuo primo viaggio"
            onPress={() => navigation.navigate('CreateTrip')}
            style={styles.emptyButton}
          />
          <TouchableOpacity onPress={() => navigation.navigate('JoinTrip')}>
            <Text style={styles.emptyLink}>Ho un codice invito</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {hero && (
            <>
              <Text style={styles.sectionTitle}>
                {classify(hero, today) === 'ongoing' ? 'Viaggio in corso' : 'Prossimo viaggio'}
              </Text>
              <HeroCard
                trip={hero}
                members={heroMembers}
                ongoing={classify(hero, today) === 'ongoing'}
                onPress={() => navigation.navigate('TripOverview', { tripId: hero.id })}
              />
            </>
          )}

          {restUpcoming.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Prossimi viaggi</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                {restUpcoming.map((trip) => (
                  <TouchableOpacity
                    key={trip.id}
                    style={styles.upcomingCard}
                    onPress={() => navigation.navigate('TripOverview', { tripId: trip.id })}
                  >
                    <Text style={styles.upcomingDestination}>{trip.destination}</Text>
                    <Text style={styles.upcomingDates}>
                      {trip.start_date} — {trip.end_date}
                    </Text>
                    <Text style={styles.upcomingBadge}>Tra {daysUntil(trip.start_date, today)} giorni</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {past.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Viaggi passati</Text>
              {past.map((trip) => (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.pastRow}
                  onPress={() => navigation.navigate('TripOverview', { tripId: trip.id })}
                >
                  <Text style={styles.pastName}>{trip.name}</Text>
                  <Text style={styles.pastDates}>
                    {trip.start_date} — {trip.end_date}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity onPress={() => navigation.navigate('JoinTrip')} style={styles.joinLink}>
            <Text style={styles.emptyLink}>Ho un codice invito</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function HeroCard({
  trip,
  members,
  ongoing,
  onPress,
}: {
  trip: TripSummary;
  members: Member[];
  ongoing: boolean;
  onPress: () => void;
}) {
  const countdown = useCountdown(trip.start_date);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <LinearGradient colors={gradients.primaryButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{ongoing ? 'In corso' : `Tra ${countdown.days} giorni`}</Text>
        </View>
        <Text style={styles.heroName}>{trip.name}</Text>
        <Text style={styles.heroDates}>
          {trip.start_date} — {trip.end_date}
        </Text>

        {ongoing && (
          <View style={styles.countdownRow}>
            <CountdownBox value={countdown.days} label="GIORNI" />
            <CountdownBox value={countdown.hours} label="ORE" />
            <CountdownBox value={countdown.minutes} label="MIN" />
          </View>
        )}

        {members.length > 0 && (
          <View style={styles.heroFooter}>
            <AvatarStack members={members} size={28} />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyTitle: { ...typography.h1, color: colors.text },
  emptySubtitle: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyButton: { width: '100%', marginTop: spacing.md },
  emptyLink: { ...typography.body, color: colors.accent },
  joinLink: { alignItems: 'center', marginTop: spacing.sm },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase', marginTop: spacing.md },
  heroCard: { borderRadius: radius.card, padding: spacing.lg, gap: spacing.xs, minHeight: 160 },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    marginBottom: spacing.xs,
  },
  heroBadgeText: { ...typography.caption, color: colors.text, fontWeight: '700' },
  heroName: { ...typography.h1, color: colors.text },
  heroDates: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  countdownRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  countdownBox: {
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.buttonPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 60,
  },
  countdownValue: { ...typography.monoLg, color: colors.text },
  countdownLabel: { ...typography.caption, color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  heroFooter: { marginTop: spacing.md },
  hScroll: { gap: spacing.md, paddingRight: spacing.lg },
  upcomingCard: {
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: 4,
  },
  upcomingDestination: { ...typography.h2, color: colors.text },
  upcomingDates: { ...typography.caption, color: colors.textMuted },
  upcomingBadge: { ...typography.caption, color: colors.accent, marginTop: spacing.xs },
  pastRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    opacity: 0.6,
  },
  pastName: { ...typography.body, color: colors.text, fontWeight: '600' },
  pastDates: { ...typography.caption, color: colors.textMuted },
});
