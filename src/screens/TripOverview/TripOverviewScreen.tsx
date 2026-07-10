import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import type { Trip, ItineraryActivity, ItineraryDay } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'TripOverview'>;

interface ActivityWithDay extends ItineraryActivity {
  day_number: number;
}

export default function TripOverviewScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activities, setActivities] = useState<ActivityWithDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrip();
  }, [tripId]);

  async function loadTrip() {
    setLoading(true);

    const { data: tripData } = await supabase
      .from('trips')
      .select('*')
      .eq('id', tripId)
      .single();
    setTrip(tripData as Trip | null);

    const { data: days } = await supabase
      .from('itinerary_days')
      .select('id, day_number')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    if (days && days.length > 0) {
      const dayIds = (days as Pick<ItineraryDay, 'id' | 'day_number'>[]).map((d) => d.id);
      const dayNumberById = new Map(
        (days as Pick<ItineraryDay, 'id' | 'day_number'>[]).map((d) => [d.id, d.day_number])
      );

      const { data: acts } = await supabase
        .from('itinerary_activities')
        .select('*')
        .in('itinerary_day_id', dayIds)
        .order('order_index', { ascending: true });

      if (acts) {
        const withDay = (acts as ItineraryActivity[]).map((a) => ({
          ...a,
          day_number: dayNumberById.get(a.itinerary_day_id) ?? 0,
        }));
        setActivities(withDay);
      }
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Viaggio non trovato.</Text>
        <TouchableOpacity onPress={() => navigation.replace('Home')}>
          <Text style={styles.backLink}>Torna alla Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(trip.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.replace('Home')}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTextBlock}>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.tripDates}>
            {trip.start_date} — {trip.end_date}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{daysRemaining}</Text>
            <Text style={styles.statLabel}>giorni</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {trip.budget_per_person ?? '–'}
              {trip.currency === 'EUR' ? '€' : ''}
            </Text>
            <Text style={styles.statLabel}>a testa</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itinerario</Text>
        {activities.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna attività generata.</Text>
        ) : (
          activities.map((a) => (
            <View key={a.id} style={styles.activityCard}>
              <View style={styles.activityDayBadge}>
                <Text style={styles.activityDayBadgeText}>Day {a.day_number}</Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{a.title}</Text>
                <Text style={styles.activityMeta}>
                  {a.time_slot} · {a.duration_minutes} min
                  {a.location_name ? ` · ${a.location_name}` : ''}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: { ...typography.body, color: colors.textMuted },
  backLink: { ...typography.body, color: colors.accent },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backText: { ...typography.h1, color: colors.text },
  headerTextBlock: { alignItems: 'center' },
  tripName: { ...typography.h2, color: colors.text },
  tripDates: { ...typography.caption, color: colors.textMuted },
  content: { padding: spacing.md, gap: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { ...typography.monoLg, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted },
  sectionTitle: { ...typography.h2, color: colors.text, marginTop: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  activityDayBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  activityDayBadgeText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  activityInfo: { flex: 1 },
  activityTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  activityMeta: { ...typography.caption, color: colors.textMuted },
});
