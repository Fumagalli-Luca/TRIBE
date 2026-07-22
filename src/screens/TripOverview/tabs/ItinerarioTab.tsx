import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import type { ItineraryActivity, ItineraryDay } from '../../../types/database';

interface Props {
  tripId: string;
}

interface DaySection {
  day: ItineraryDay;
  activities: ItineraryActivity[];
}

const TIME_SLOT_LABEL: Record<string, string> = {
  morning: 'Mattina',
  afternoon: 'Pomeriggio',
  evening: 'Sera',
};

export default function ItinerarioTab({ tripId }: Props) {
  const [sections, setSections] = useState<DaySection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);

    const { data: days } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    const dayRows = (days as ItineraryDay[]) ?? [];

    if (dayRows.length === 0) {
      setSections([]);
      setLoading(false);
      return;
    }

    const { data: acts } = await supabase
      .from('itinerary_activities')
      .select('*')
      .in('itinerary_day_id', dayRows.map((d) => d.id))
      .order('order_index', { ascending: true });

    const actRows = (acts as ItineraryActivity[]) ?? [];

    setSections(
      dayRows.map((day) => ({
        day,
        activities: actRows.filter((a) => a.itinerary_day_id === day.id),
      }))
    );
    setLoading(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (sections.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Nessuna attività generata.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {sections.map(({ day, activities }) => (
        <View key={day.id} style={styles.daySection}>
          <Text style={styles.dayTitle}>Day {day.day_number}</Text>
          <Text style={styles.dayDate}>{day.date}</Text>
          {activities.length === 0 ? (
            <Text style={styles.emptyText}>Nessuna attività per questo giorno.</Text>
          ) : (
            activities.map((a) => (
              <View key={a.id} style={styles.activityCard}>
                <View style={styles.activitySlotBadge}>
                  <Text style={styles.activitySlotText}>
                    {TIME_SLOT_LABEL[a.time_slot ?? ''] ?? a.time_slot}
                  </Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{a.title}</Text>
                  <Text style={styles.activityMeta}>
                    {a.duration_minutes ? `${a.duration_minutes} min` : ''}
                    {a.location_name ? ` · ${a.location_name}` : ''}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
  container: { gap: spacing.lg },
  daySection: { gap: spacing.sm },
  dayTitle: { ...typography.h2, color: colors.text },
  dayDate: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  activitySlotBadge: {
    backgroundColor: colors.background,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  activitySlotText: { ...typography.caption, color: colors.accent, fontWeight: '600' },
  activityInfo: { flex: 1 },
  activityTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  activityMeta: { ...typography.caption, color: colors.textMuted },
});
