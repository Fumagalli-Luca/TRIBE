import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Settings } from 'lucide-react-native';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import type { Trip } from '../../types/database';
import AvatarStack from '../../components/AvatarStack';
import ItinerarioTab from './tabs/ItinerarioTab';
import BudgetTab from './tabs/BudgetTab';
import GroupTab from './tabs/GroupTab';
import ChatTab from './tabs/ChatTab';
import ChecklistTab from './tabs/ChecklistTab';

type Props = NativeStackScreenProps<RootStackParamList, 'TripOverview'>;

type TabKey = 'itinerario' | 'budget' | 'gruppo' | 'chat' | 'checklist';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'itinerario', label: 'Itinerario' },
  { key: 'budget', label: 'Budget' },
  { key: 'gruppo', label: 'Gruppo' },
  { key: 'chat', label: 'Chat' },
  { key: 'checklist', label: 'Checklist' },
];

interface Member {
  name: string | null;
  avatarUrl: string | null;
}

export default function TripOverviewScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { tripId } = route.params;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [openVotesCount, setOpenVotesCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('itinerario');

  useEffect(() => {
    loadTrip();
    const unsubscribe = navigation.addListener('focus', refreshTripInfo);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, navigation]);

  async function refreshTripInfo() {
    const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
    if (data) setTrip(data as Trip);

    const { data: expenseRows } = await supabase.from('expenses').select('amount').eq('trip_id', tripId);
    setTotalSpent(((expenseRows as { amount: number }[]) ?? []).reduce((sum, e) => sum + Number(e.amount), 0));

    const { count } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('status', 'open');
    setOpenVotesCount(count ?? 0);
  }

  async function loadTrip() {
    setLoading(true);

    const { data } = await supabase.from('trips').select('*').eq('id', tripId).single();
    const tripRow = data as Trip | null;
    setTrip(tripRow);

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('user:users!trip_members_user_id_fkey(full_name, avatar_url)')
      .eq('trip_id', tripId)
      .eq('status', 'accepted');
    const memberList = ((memberRows as unknown as { user: Member | null }[]) ?? [])
      .filter((r) => r.user)
      .map((r) => r.user!);
    setMembers(memberList);

    await refreshTripInfo();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: myMembership } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();
      setIsAdmin((myMembership as { role: string } | null)?.role === 'admin');
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const msPerDay = 1000 * 60 * 60 * 24;

  let dayStatValue: number;
  let dayStatLabel: string;
  if (endDate < today) {
    dayStatValue = 0;
    dayStatLabel = 'concluso';
  } else if (startDate <= today) {
    const dayNumber = Math.floor((today.getTime() - startDate.getTime()) / msPerDay) + 1;
    const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
    dayStatValue = dayNumber;
    dayStatLabel = `giorno ${dayNumber}/${totalDays}`;
  } else {
    dayStatValue = Math.ceil((startDate.getTime() - today.getTime()) / msPerDay);
    dayStatLabel = 'giorni';
  }

  const budgetTotal = trip.budget_per_person ? trip.budget_per_person * members.length : null;
  const currencySymbol = trip.currency === 'EUR' ? '€' : trip.currency;
  const budgetRatio = budgetTotal ? totalSpent / budgetTotal : null;
  const budgetStatusColor =
    budgetRatio === null ? colors.text : budgetRatio > 1 ? colors.danger : budgetRatio >= 0.8 ? colors.warning : colors.success;

  return (
    <View style={styles.flex}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
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
        {isAdmin ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('TripSettings', { tripId })}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Settings size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {members.length > 0 && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.avatarRow}>
          <AvatarStack members={members} size={28} max={5} />
        </Animated.View>
      )}

      <View style={styles.statsRow}>
        <Animated.View entering={FadeInUp.duration(320).delay(40)} style={styles.statBox}>
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{dayStatValue}</Text>
          <Text style={styles.statLabel}>{dayStatLabel}</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(320).delay(90)} style={styles.statBox}>
          <TouchableOpacity style={styles.statBoxTouchable} onPress={() => setActiveTab('budget')}>
            <Text
              style={[styles.statValue, { color: budgetStatusColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {totalSpent.toFixed(0)}
              {currencySymbol}
              {budgetTotal ? ` / ${budgetTotal.toFixed(0)}${currencySymbol}` : ''}
            </Text>
            <Text style={styles.statLabel}>speso</Text>
          </TouchableOpacity>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(320).delay(140)} style={styles.statBox}>
          <TouchableOpacity style={styles.statBoxTouchable} onPress={() => navigation.navigate('Voting', { tripId })}>
            <Text style={[styles.statValue, openVotesCount > 0 && styles.statValueAlert]}>{openVotesCount}</Text>
            <Text style={styles.statLabel}>decisioni</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={styles.tabItem}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
              {tab.label}
            </Text>
            {activeTab === tab.key && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'chat' ? (
        <ChatTab tripId={tripId} navigation={navigation} />
      ) : activeTab === 'itinerario' ? (
        // Gestisce da sé lo scroll (DraggableFlatList per il drag-to-reorder):
        // non va annidato in un altro ScrollView.
        <ItinerarioTab tripId={tripId} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {activeTab === 'budget' && <BudgetTab tripId={tripId} />}
          {activeTab === 'gruppo' && <GroupTab tripId={tripId} navigation={navigation} />}
          {activeTab === 'checklist' && <ChecklistTab tripId={tripId} />}
        </ScrollView>
      )}
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
  avatarRow: { alignItems: 'center', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
  },
  statBoxTouchable: { width: '100%', alignItems: 'center' },
  statValue: { ...typography.monoLg, color: colors.text, fontSize: 18 },
  statValueAlert: { color: colors.danger },
  statLabel: { ...typography.caption, color: colors.textMuted },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, gap: spacing.xs },
  tabLabel: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  tabLabelActive: { color: colors.accent },
  tabIndicator: {
    height: 2,
    width: '100%',
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
