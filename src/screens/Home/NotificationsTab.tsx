import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeNavigationProp } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';

interface Props {
  navigation: HomeNavigationProp;
}

interface PendingVote {
  id: string;
  title: string;
  trip_id: string;
  tripName: string;
}

export async function fetchPendingVoteCount(): Promise<number> {
  const votes = await fetchPendingVotes();
  return votes.length;
}

async function fetchPendingVotes(): Promise<PendingVote[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: memberRows } = await supabase
    .from('trip_members')
    .select('trip_id, trip:trips(name)')
    .eq('user_id', user.id)
    .eq('status', 'accepted');

  const tripIds = ((memberRows as unknown as { trip_id: string }[]) ?? []).map((r) => r.trip_id);
  if (tripIds.length === 0) return [];

  const tripNameById = new Map(
    ((memberRows as unknown as { trip_id: string; trip: { name: string } | null }[]) ?? []).map((r) => [
      r.trip_id,
      r.trip?.name ?? 'Viaggio',
    ])
  );

  const { data: openVotes } = await supabase
    .from('votes')
    .select('id, title, trip_id')
    .in('trip_id', tripIds)
    .eq('status', 'open');

  const votes = (openVotes as { id: string; title: string; trip_id: string }[]) ?? [];
  if (votes.length === 0) return [];

  const { data: myChoices } = await supabase
    .from('vote_choices')
    .select('vote_id')
    .eq('user_id', user.id)
    .in(
      'vote_id',
      votes.map((v) => v.id)
    );

  const votedIds = new Set(((myChoices as { vote_id: string }[]) ?? []).map((c) => c.vote_id));

  return votes
    .filter((v) => !votedIds.has(v.id))
    .map((v) => ({ id: v.id, title: v.title, trip_id: v.trip_id, tripName: tripNameById.get(v.trip_id) ?? 'Viaggio' }));
}

export default function NotificationsTab({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [votes, setVotes] = useState<PendingVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    load();
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  async function load() {
    setLoading(true);
    setVotes(await fetchPendingVotes());
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Notifiche</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : votes.length === 0 ? (
        <Text style={styles.emptyText}>Nessuna notifica al momento.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {votes.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={styles.card}
              onPress={() => navigation.navigate('Voting', { tripId: v.trip_id, voteId: v.id })}
            >
              <Text style={styles.cardTitle}>Nuovo voto: {v.title}</Text>
              <Text style={styles.cardSubtitle}>{v.tripName} · in attesa del tuo voto</Text>
            </TouchableOpacity>
          ))}
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
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: 4 },
  cardTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  cardSubtitle: { ...typography.caption, color: colors.textMuted },
});
