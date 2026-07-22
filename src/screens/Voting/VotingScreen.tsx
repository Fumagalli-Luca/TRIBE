import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Info, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors, radius, spacing, typography } from '../../constants/theme';
import { supabase } from '../../lib/supabase';
import SwipeCard from '../../components/SwipeCard';
import Chip from '../../components/Chip';
import GradientButton from '../../components/GradientButton';
import type { Vote, VoteChoiceRow, VoteOption } from '../../types/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Voting'>;

const CATEGORIES = [
  { key: 'hotel', label: 'Hotel' },
  { key: 'activity', label: 'Attività' },
  { key: 'restaurant', label: 'Ristorante' },
  { key: 'general', label: 'Generale' },
];

export default function VotingScreen({ route, navigation }: Props) {
  const { tripId, voteId } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [vote, setVote] = useState<Vote | null>(null);
  const [choices, setChoices] = useState<VoteChoiceRow[]>([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeSignal, setSwipeSignal] = useState<'left' | 'right' | null>(null);
  const [closing, setClosing] = useState(false);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general');
  const [newOptions, setNewOptions] = useState<{ name: string; price: string }[]>([
    { name: '', price: '' },
    { name: '', price: '' },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, voteId]);

  async function load() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);

    const { count: memberCount } = await supabase
      .from('trip_members')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('status', 'accepted');
    setTotalMembers(memberCount ?? 0);

    if (user) {
      const { data: myMembership } = await supabase
        .from('trip_members')
        .select('role')
        .eq('trip_id', tripId)
        .eq('user_id', user.id)
        .single();
      setIsAdmin((myMembership as { role: string } | null)?.role === 'admin');
    }

    let voteRow: Vote | null = null;
    if (voteId) {
      const { data } = await supabase.from('votes').select('*').eq('id', voteId).single();
      voteRow = data as Vote | null;
    } else {
      const { data } = await supabase
        .from('votes')
        .select('*')
        .eq('trip_id', tripId)
        .eq('status', 'open')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      voteRow = data as Vote | null;
    }
    setVote(voteRow);

    if (voteRow) {
      const { data: choiceRows } = await supabase
        .from('vote_choices')
        .select('*')
        .eq('vote_id', voteRow.id);
      const allChoices = (choiceRows as VoteChoiceRow[]) ?? [];
      setChoices(allChoices);

      if (user) {
        const myAnswered = new Set(
          allChoices.filter((c) => c.user_id === user.id).map((c) => c.option_id)
        );
        const firstUnanswered = voteRow.options.findIndex((o) => !myAnswered.has(o.id));
        setCurrentIndex(firstUnanswered === -1 ? voteRow.options.length : firstUnanswered);
      }
    } else {
      setChoices([]);
    }

    setLoading(false);
  }

  const votersCompleted = useMemo(() => {
    if (!vote) return 0;
    const byUser = new Map<string, Set<string>>();
    for (const c of choices) {
      if (!byUser.has(c.user_id)) byUser.set(c.user_id, new Set());
      byUser.get(c.user_id)!.add(c.option_id);
    }
    let completed = 0;
    for (const optionSet of byUser.values()) {
      if (optionSet.size >= vote.options.length) completed += 1;
    }
    return completed;
  }, [choices, vote]);

  async function recordChoice(option: VoteOption, decision: 'yes' | 'no') {
    if (!vote || !userId) return;
    setChoices((prev) => [
      ...prev.filter((c) => !(c.user_id === userId && c.option_id === option.id)),
      {
        id: `local-${option.id}`,
        vote_id: vote.id,
        user_id: userId,
        option_id: option.id,
        choice: decision,
        created_at: new Date().toISOString(),
      },
    ]);

    await supabase.from('vote_choices').upsert(
      { vote_id: vote.id, user_id: userId, option_id: option.id, choice: decision },
      { onConflict: 'vote_id,user_id,option_id' }
    );

    setSwipeSignal(null);
    setCurrentIndex((i) => i + 1);
  }

  async function handleCloseVote() {
    if (!vote) return;
    setClosing(true);

    const yesCountByOption = new Map<string, number>();
    for (const o of vote.options) yesCountByOption.set(o.id, 0);
    for (const c of choices) {
      if (c.choice === 'yes') yesCountByOption.set(c.option_id, (yesCountByOption.get(c.option_id) ?? 0) + 1);
    }

    let winner = vote.options[0];
    let winnerYes = -1;
    for (const o of vote.options) {
      const yes = yesCountByOption.get(o.id) ?? 0;
      if (
        yes > winnerYes ||
        (yes === winnerYes && (o.price ?? Infinity) < (winner.price ?? Infinity))
      ) {
        winner = o;
        winnerYes = yes;
      }
    }

    const totalCast = choices.filter((c) => c.option_id === winner.id).length;

    await supabase
      .from('votes')
      .update({ status: 'closed', winning_option_id: winner.id })
      .eq('id', vote.id);

    await supabase.from('chat_messages').insert({
      trip_id: tripId,
      sender_id: null,
      type: 'system',
      content: `Il gruppo ha scelto ${winner.name}! ${winnerYes} voti positivi su ${totalCast || winnerYes}.`,
    });

    setClosing(false);
    await load();
  }

  function updateOption(index: number, field: 'name' | 'price', value: string) {
    setNewOptions((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)));
  }

  async function handleCreateVote() {
    const validOptions = newOptions.filter((o) => o.name.trim());
    if (!newTitle.trim() || validOptions.length < 2 || creating) return;
    setCreating(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCreating(false);
      return;
    }

    const options: VoteOption[] = validOptions.map((o, i) => ({
      id: `opt-${Date.now()}-${i}`,
      name: o.name.trim(),
      price: o.price ? Number(o.price) : undefined,
    }));

    const { data: newVote, error } = await supabase
      .from('votes')
      .insert({
        trip_id: tripId,
        title: newTitle.trim(),
        category: newCategory,
        options,
        status: 'open',
        created_by: user.id,
      })
      .select()
      .single();

    if (!error && newVote) {
      await supabase.from('chat_messages').insert({
        trip_id: tripId,
        sender_id: null,
        type: 'system',
        content: `Nuovo voto: ${(newVote as Vote).title}`,
        metadata: { vote_id: (newVote as Vote).id },
      });

      setCreateModalVisible(false);
      setNewTitle('');
      setNewOptions([{ name: '', price: '' }, { name: '', price: '' }]);
      await load();
    }
    setCreating(false);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
        <Text style={styles.backText}>‹</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{vote?.title ?? 'Votazioni'}</Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (!vote) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Nessuna votazione aperta al momento.</Text>
          <GradientButton label="+ Nuovo voto" onPress={() => setCreateModalVisible(true)} />
        </View>
        {renderCreateModal()}
      </View>
    );
  }

  if (vote.status === 'closed') {
    const yesCountByOption = new Map<string, number>();
    for (const o of vote.options) yesCountByOption.set(o.id, 0);
    for (const c of choices) {
      if (c.choice === 'yes') yesCountByOption.set(c.option_id, (yesCountByOption.get(c.option_id) ?? 0) + 1);
    }
    const maxYes = Math.max(1, ...Array.from(yesCountByOption.values()));

    return (
      <View style={styles.flex}>
        {header}
        <ScrollView contentContainerStyle={styles.resultsContent}>
          <Text style={styles.resultsTitle}>Risultato</Text>
          {vote.options.map((o) => {
            const yes = yesCountByOption.get(o.id) ?? 0;
            const isWinner = o.id === vote.winning_option_id;
            return (
              <View key={o.id} style={[styles.resultRow, isWinner && styles.resultRowWinner]}>
                <View style={styles.resultRowTop}>
                  <Text style={styles.resultName}>
                    {isWinner ? '🏆 ' : ''}
                    {o.name}
                  </Text>
                  <Text style={styles.resultCount}>{yes}</Text>
                </View>
                <View style={styles.resultTrack}>
                  <View style={[styles.resultFill, { width: `${(yes / maxYes) * 100}%` }]} />
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (currentIndex >= vote.options.length) {
    return (
      <View style={styles.flex}>
        {header}
        <View style={styles.centered}>
          <Text style={styles.counterText}>
            {votersCompleted}/{totalMembers} hanno votato
          </Text>
          <Text style={styles.emptyText}>Hai votato tutte le opzioni. Aspettiamo il resto del gruppo.</Text>
          {(isAdmin || vote.created_by === userId) && (
            <GradientButton label={closing ? 'Chiudo...' : 'Chiudi votazione'} onPress={handleCloseVote} loading={closing} />
          )}
        </View>
      </View>
    );
  }

  const option = vote.options[currentIndex];

  return (
    <View style={styles.flex}>
      {header}
      <Text style={styles.counterText}>
        {votersCompleted}/{totalMembers} hanno votato
      </Text>

      <View style={styles.cardArea}>
        <SwipeCard
          swipeSignal={swipeSignal}
          onSwipeRight={() => recordChoice(option, 'yes')}
          onSwipeLeft={() => recordChoice(option, 'no')}
        >
          <View style={styles.optionCard}>
            <View style={styles.optionImagePlaceholder}>
              <Text style={styles.optionImageEmoji}>🏨</Text>
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionName}>{option.name}</Text>
              {option.price !== undefined && <Text style={styles.optionPrice}>{option.price}€</Text>}
            </View>
          </View>
        </SwipeCard>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setSwipeSignal('left')}>
          <X size={26} color={colors.danger} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() =>
            Alert.alert(option.name, option.price !== undefined ? `Prezzo indicativo: ${option.price}€` : 'Nessun dettaglio aggiuntivo.')
          }
        >
          <Info size={22} color={colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => setSwipeSignal('right')}>
          <Heart size={26} color={colors.success} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.skipLink} onPress={() => setCurrentIndex((i) => i + 1)}>
        <Text style={styles.skipText}>Salta</Text>
      </TouchableOpacity>
    </View>
  );

  function renderCreateModal() {
    return (
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuovo voto</Text>
            <TextInput
              style={styles.input}
              placeholder="Es. Hotel per Barcellona"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Chip key={c.key} label={c.label} selected={newCategory === c.key} onPress={() => setNewCategory(c.key)} />
              ))}
            </View>

            <Text style={styles.fieldLabel}>Opzioni</Text>
            {newOptions.map((o, i) => (
              <View key={i} style={styles.optionInputRow}>
                <TextInput
                  style={[styles.input, styles.optionInputName]}
                  placeholder={`Opzione ${i + 1}`}
                  placeholderTextColor={colors.textMuted}
                  value={o.name}
                  onChangeText={(v) => updateOption(i, 'name', v)}
                />
                <TextInput
                  style={[styles.input, styles.optionInputPrice]}
                  placeholder="€"
                  placeholderTextColor={colors.textMuted}
                  value={o.price}
                  onChangeText={(v) => updateOption(i, 'price', v)}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
            <TouchableOpacity
              onPress={() => setNewOptions((prev) => [...prev, { name: '', price: '' }])}
            >
              <Text style={styles.addOptionText}>+ Aggiungi opzione</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleCreateVote} disabled={creating}>
                <Text style={styles.modalConfirmText}>{creating ? 'Creo...' : 'Crea voto'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  counterText: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.sm },
  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  optionCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  optionImagePlaceholder: {
    height: 280,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionImageEmoji: { fontSize: 64 },
  optionInfo: { padding: spacing.lg, gap: 4 },
  optionName: { ...typography.h1, color: colors.text },
  optionPrice: { ...typography.monoSm, color: colors.textMuted },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipLink: { alignItems: 'center', paddingBottom: spacing.lg },
  skipText: { ...typography.body, color: colors.textMuted },
  resultsContent: { padding: spacing.lg, gap: spacing.md },
  resultsTitle: { ...typography.h1, color: colors.text, marginBottom: spacing.sm },
  resultRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultRowWinner: { borderWidth: 1, borderColor: colors.success },
  resultRowTop: { flexDirection: 'row', justifyContent: 'space-between' },
  resultName: { ...typography.body, color: colors.text, fontWeight: '600' },
  resultCount: { ...typography.monoSm, color: colors.textMuted },
  resultTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  resultFill: { height: 6, backgroundColor: colors.success },
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionInputRow: { flexDirection: 'row', gap: spacing.sm },
  optionInputName: { flex: 3 },
  optionInputPrice: { flex: 1 },
  addOptionText: { ...typography.caption, color: colors.accent, marginTop: spacing.xs },
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
