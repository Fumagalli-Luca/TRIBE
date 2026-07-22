import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeNavigationProp } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Props {
  navigation: HomeNavigationProp;
}

interface TripSummary {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export default function TripsTab({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function load() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('trip_members')
      .select('trip:trips(id, name, destination, start_date, end_date)')
      .eq('user_id', user.id)
      .eq('status', 'accepted');

    const tripList = ((data as unknown as { trip: TripSummary | null }[]) ?? [])
      .map((row) => row.trip)
      .filter((t): t is TripSummary => t !== null)
      .sort((a, b) => b.start_date.localeCompare(a.start_date));

    setTrips(tripList);
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>I tuoi viaggi</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />
          }
        >
          {trips.length === 0 ? (
            <Text style={styles.emptyText}>Nessun viaggio ancora.</Text>
          ) : (
            trips.map((trip) => (
              <TouchableOpacity
                key={trip.id}
                style={styles.card}
                onPress={() => navigation.navigate('TripOverview', { tripId: trip.id })}
              >
                <Text style={styles.name}>{trip.name}</Text>
                <Text style={styles.destination}>{trip.destination}</Text>
                <Text style={styles.dates}>
                  {trip.start_date} — {trip.end_date}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { ...typography.h1, color: colors.text },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: 2 },
  name: { ...typography.h2, color: colors.text },
  destination: { ...typography.body, color: colors.textMuted },
  dates: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
});
