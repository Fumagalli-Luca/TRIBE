import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Filter } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import GradientButton from '../../../components/GradientButton';
import Chip from '../../../components/Chip';
import type { ItineraryActivity, ItineraryDay, ItineraryTimeSlot } from '../../../types/database';

interface Props {
  tripId: string;
}

const TIME_SLOT_LABEL: Record<string, string> = {
  morning: 'Mattina',
  afternoon: 'Pomeriggio',
  evening: 'Sera',
};

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  culture: '🏛️',
  party: '🎉',
  outdoor: '🏔️',
  transport: '🚗',
};

function categoryEmoji(category: string | null): string {
  return CATEGORY_EMOJI[category ?? ''] ?? '📍';
}

export default function ItinerarioTab({ tripId }: Props) {
  const [days, setDays] = useState<ItineraryDay[]>([]);
  const [activities, setActivities] = useState<ItineraryActivity[]>([]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('culture');
  const [timeSlot, setTimeSlot] = useState<ItineraryTimeSlot>('morning');
  const [duration, setDuration] = useState('');
  const [locationName, setLocationName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);

    const { data: dayRows } = await supabase
      .from('itinerary_days')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_number', { ascending: true });

    const dayList = (dayRows as ItineraryDay[]) ?? [];
    setDays(dayList);
    setSelectedDayId((prev) => prev ?? dayList[0]?.id ?? null);

    if (dayList.length > 0) {
      const { data: actRows } = await supabase
        .from('itinerary_activities')
        .select('*')
        .in('itinerary_day_id', dayList.map((d) => d.id))
        .order('order_index', { ascending: true });
      setActivities((actRows as ItineraryActivity[]) ?? []);
    }

    setLoading(false);
  }

  const dayActivities = useMemo(() => {
    const filtered = activities.filter((a) => a.itinerary_day_id === selectedDayId);
    return categoryFilter ? filtered.filter((a) => a.category === categoryFilter) : filtered;
  }, [activities, selectedDayId, categoryFilter]);

  const categories = useMemo(
    () => Array.from(new Set(activities.map((a) => a.category).filter((c): c is string => !!c))),
    [activities]
  );

  async function handleAdd() {
    if (!title.trim() || !selectedDayId || saving) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('itinerary_activities')
      .insert({
        itinerary_day_id: selectedDayId,
        title: title.trim(),
        category,
        time_slot: timeSlot,
        duration_minutes: duration ? Number(duration) : null,
        location_name: locationName.trim() || null,
        source: 'manual',
        status: 'confirmed',
        order_index: activities.filter((a) => a.itinerary_day_id === selectedDayId).length,
      })
      .select()
      .single();

    if (!error && data) {
      setActivities((prev) => [...prev, data as ItineraryActivity]);
      setTitle('');
      setDuration('');
      setLocationName('');
      setModalVisible(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Nessuna attività generata.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dayTabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
          {days.map((day) => (
            <Chip
              key={day.id}
              label={`Day ${day.day_number}`}
              selected={selectedDayId === day.id}
              onPress={() => setSelectedDayId(day.id)}
            />
          ))}
        </ScrollView>
        {categories.length > 1 && (
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setCategoryFilter((c) => (c ? null : categories[0]))}
          >
            <Filter size={16} color={categoryFilter ? colors.accent : colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {categoryFilter && (
        <View style={styles.chipRow}>
          {categories.map((c) => (
            <Chip
              key={c}
              label={`${categoryEmoji(c)} ${c}`}
              selected={categoryFilter === c}
              onPress={() => setCategoryFilter(c)}
            />
          ))}
        </View>
      )}

      <View style={styles.timeline}>
        {dayActivities.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna attività per questo giorno.</Text>
        ) : (
          dayActivities.map((a, index) => (
            <View key={a.id} style={styles.timelineRow}>
              <View style={styles.timelineMarkerCol}>
                <View style={styles.timelineDot} />
                {index < dayActivities.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.activityCard}>
                <View style={styles.activityIconBox}>
                  <Text style={styles.activityIcon}>{categoryEmoji(a.category)}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityTitle}>{a.title}</Text>
                  <Text style={styles.activityMeta}>
                    {TIME_SLOT_LABEL[a.time_slot ?? ''] ?? a.time_slot}
                    {a.duration_minutes ? ` · ${a.duration_minutes} min` : ''}
                    {a.location_name ? ` · ${a.location_name}` : ''}
                  </Text>
                  <View style={styles.tagRow}>
                    <Text style={[styles.tag, a.source === 'ai' ? styles.tagAi : styles.tagConfirmed]}>
                      {a.source === 'ai' ? 'AI suggerito' : 'Confermato'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <GradientButton label="+ Aggiungi attività" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuova attività</Text>
            <TextInput
              style={styles.input}
              placeholder="Titolo"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Luogo (opzionale)"
              placeholderTextColor={colors.textMuted}
              value={locationName}
              onChangeText={setLocationName}
            />
            <TextInput
              style={styles.input}
              placeholder="Durata (minuti)"
              placeholderTextColor={colors.textMuted}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
            />

            <Text style={styles.fieldLabel}>Momento</Text>
            <View style={styles.chipRow}>
              {(['morning', 'afternoon', 'evening'] as ItineraryTimeSlot[]).map((slot) => (
                <Chip
                  key={slot}
                  label={TIME_SLOT_LABEL[slot]}
                  selected={timeSlot === slot}
                  onPress={() => setTimeSlot(slot)}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.chipRow}>
              {Object.keys(CATEGORY_EMOJI).map((c) => (
                <Chip
                  key={c}
                  label={`${CATEGORY_EMOJI[c]} ${c}`}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAdd} disabled={saving}>
                <Text style={styles.modalConfirmText}>{saving ? 'Salvo...' : 'Aggiungi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted },
  container: { gap: spacing.lg },
  dayTabsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  timeline: { gap: 0 },
  timelineRow: { flexDirection: 'row', gap: spacing.sm },
  timelineMarkerCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: spacing.md },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4 },
  activityCard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  activityIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.buttonPrimary,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: { fontSize: 20 },
  activityInfo: { flex: 1, gap: 2 },
  activityTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  activityMeta: { ...typography.caption, color: colors.textMuted },
  tagRow: { flexDirection: 'row', marginTop: spacing.xs },
  tag: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    overflow: 'hidden',
  },
  tagAi: { color: colors.accent, backgroundColor: 'rgba(56,189,248,0.15)' },
  tagConfirmed: { color: colors.success, backgroundColor: 'rgba(34,197,94,0.15)' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '85%',
  },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
    borderRadius: radius.buttonPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  fieldLabel: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  modalCancel: {
    flex: 1,
    height: 48,
    borderRadius: radius.buttonPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { ...typography.body, color: colors.textMuted },
  modalConfirm: {
    flex: 1,
    height: 48,
    borderRadius: radius.buttonPrimary,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: { ...typography.body, fontWeight: '600', color: colors.text },
});
