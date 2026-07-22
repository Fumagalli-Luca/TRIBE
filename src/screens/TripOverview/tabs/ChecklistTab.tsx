import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import Chip from '../../../components/Chip';
import GradientButton from '../../../components/GradientButton';
import { hapticSelect } from '../../../lib/haptics';
import type { ChecklistCategory, ChecklistItem } from '../../../types/database';

interface Props {
  tripId: string;
}

const CATEGORIES: { key: ChecklistCategory; label: string; emoji: string }[] = [
  { key: 'documents', label: 'Documenti', emoji: '🛂' },
  { key: 'packing', label: 'Bagagli', emoji: '🎒' },
  { key: 'bookings', label: 'Prenotazioni', emoji: '📅' },
  { key: 'other', label: 'Altro', emoji: '📌' },
];

export default function ChecklistTab({ tripId }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChecklistCategory>('other');
  const [scope, setScope] = useState<'shared' | 'personal'>('shared');
  const [scopeFilter, setScopeFilter] = useState<'shared' | 'personal'>('shared');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { data } = await supabase
      .from('checklist_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: true });
    setItems((data as ChecklistItem[]) ?? []);
    setLoading(false);
  }

  async function toggleDone(item: ChecklistItem) {
    hapticSelect();
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_done: !i.is_done } : i))
    );
    await supabase.from('checklist_items').update({ is_done: !item.is_done }).eq('id', item.id);
  }

  async function handleAdd() {
    if (!title.trim() || saving) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('checklist_items')
      .insert({
        trip_id: tripId,
        title: title.trim(),
        category,
        scope,
        assigned_to: scope === 'personal' ? userId : null,
      })
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [...prev, data as ChecklistItem]);
      setTitle('');
      setCategory('other');
      setScope('shared');
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

  const scopedItems = items.filter((i) => i.scope === scopeFilter);

  return (
    <View style={styles.container}>
      <View style={styles.scopeRow}>
        <Chip label="Condivisa" selected={scopeFilter === 'shared'} onPress={() => setScopeFilter('shared')} />
        <Chip label="Personale" selected={scopeFilter === 'personal'} onPress={() => setScopeFilter('personal')} />
      </View>

      {CATEGORIES.map((cat) => {
        const catItems = scopedItems.filter((i) => i.category === cat.key);
        if (catItems.length === 0) return null;
        const doneCount = catItems.filter((i) => i.is_done).length;

        return (
          <View key={cat.key} style={styles.categorySection}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>
                {cat.emoji} {cat.label}
              </Text>
              <Text style={styles.categoryProgress}>
                {doneCount}/{catItems.length}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(doneCount / catItems.length) * 100}%` },
                ]}
              />
            </View>

            {catItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemRow}
                onPress={() => toggleDone(item)}
              >
                <View style={[styles.checkbox, item.is_done && styles.checkboxChecked]}>
                  {item.is_done && <Text style={styles.checkboxMark}>✓</Text>}
                </View>
                <Text style={[styles.itemText, item.is_done && styles.itemTextDone]}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );
      })}

      {scopedItems.length === 0 && <Text style={styles.emptyText}>Nessun elemento qui.</Text>}

      <GradientButton label="+ Aggiungi item" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuovo elemento</Text>
            <TextInput
              style={styles.input}
              placeholder="Es. Documento identità"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, category === cat.key && styles.chipSelected]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text
                    style={[styles.chipText, category === cat.key && styles.chipTextSelected]}
                  >
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Visibilità</Text>
            <View style={styles.chipRow}>
              {(['shared', 'personal'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, scope === s && styles.chipSelected]}
                  onPress={() => setScope(s)}
                >
                  <Text style={[styles.chipText, scope === s && styles.chipTextSelected]}>
                    {s === 'shared' ? 'Condiviso' : 'Personale'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleAdd}
                disabled={saving || !title.trim()}
              >
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
  container: { gap: spacing.lg },
  scopeRow: { flexDirection: 'row', gap: spacing.sm },
  emptyText: { ...typography.body, color: colors.textMuted },
  categorySection: { gap: spacing.sm },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryTitle: { ...typography.h2, color: colors.text },
  categoryProgress: { ...typography.monoSm, color: colors.textMuted },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.success },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxMark: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemText: { ...typography.body, color: colors.text, flex: 1 },
  itemTextDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textMuted },
  chipTextSelected: { color: colors.text, fontWeight: '600' },
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
