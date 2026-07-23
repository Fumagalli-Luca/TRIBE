import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { simplifyDebts, type MemberBalance } from '../../../lib/balances';
import ProgressRing from '../../../components/ProgressRing';
import GradientButton from '../../../components/GradientButton';
import { hapticSuccess } from '../../../lib/haptics';
import { useCountUp } from '../../../lib/useCountUp';
import type { Expense, ExpenseCategory, ExpenseSplit, Settlement } from '../../../types/database';

interface Props {
  tripId: string;
  onChanged?: () => void;
}

interface MemberRow {
  userId: string;
  name: string;
}

const CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
  { key: 'food', label: 'Cibo', emoji: '🍔' },
  { key: 'transport', label: 'Trasporto', emoji: '🚗' },
  { key: 'accommodation', label: 'Alloggio', emoji: '🏨' },
  { key: 'activity', label: 'Attività', emoji: '🎟️' },
  { key: 'other', label: 'Altro', emoji: '💳' },
];

function formatAmount(n: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${n.toFixed(2)}${symbol}`;
}

export default function BudgetTab({ tripId, onChanged }: Props) {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('EUR');
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [settling, setSettling] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Set<string>>(new Set());
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

    const { data: trip } = await supabase
      .from('trips')
      .select('budget_per_person, currency')
      .eq('id', tripId)
      .single();
    const tripRow = trip as { budget_per_person: number | null; currency: string } | null;
    setCurrency(tripRow?.currency ?? 'EUR');

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('user_id, status, user:users!trip_members_user_id_fkey(full_name)')
      .eq('trip_id', tripId)
      .eq('status', 'accepted');

    const memberList = ((memberRows as unknown as {
      user_id: string;
      user: { full_name: string | null } | null;
    }[]) ?? []).map((m) => ({ userId: m.user_id, name: m.user?.full_name ?? 'Utente' }));
    setMembers(memberList);
    setBudgetTotal(
      tripRow?.budget_per_person ? tripRow.budget_per_person * memberList.length : null
    );
    setParticipants(new Set(memberList.map((m) => m.userId)));
    setPaidBy(user?.id ?? memberList[0]?.userId ?? null);

    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false });
    const expenseList = (expenseRows as Expense[]) ?? [];
    setExpenses(expenseList);

    if (expenseList.length > 0) {
      const { data: splitRows } = await supabase
        .from('expense_splits')
        .select('*')
        .in('expense_id', expenseList.map((e) => e.id));
      setSplits((splitRows as ExpenseSplit[]) ?? []);
    } else {
      setSplits([]);
    }

    const { data: settlementRows } = await supabase
      .from('settlements')
      .select('*')
      .eq('trip_id', tripId);
    setSettlements((settlementRows as Settlement[]) ?? []);

    setLoading(false);
  }

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);
  const animatedTotalSpent = useCountUp(totalSpent);

  const balances: MemberBalance[] = useMemo(() => {
    return members.map((m) => {
      const paid = expenses
        .filter((e) => e.paid_by === m.userId)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const owed = splits
        .filter((s) => s.user_id === m.userId)
        .reduce((sum, s) => sum + Number(s.amount_owed), 0);
      const settledAsDebtor = settlements
        .filter((s) => s.from_user === m.userId)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      const settledAsCreditor = settlements
        .filter((s) => s.to_user === m.userId)
        .reduce((sum, s) => sum + Number(s.amount), 0);
      return { userId: m.userId, name: m.name, net: paid - owed + settledAsDebtor - settledAsCreditor };
    });
  }, [members, expenses, splits, settlements]);

  const transactions = useMemo(() => simplifyDebts(balances), [balances]);

  async function handleSettle(fromUserId: string, toUserId: string, transactionAmount: number) {
    setSettling(`${fromUserId}-${toUserId}`);
    await supabase.from('settlements').insert({
      trip_id: tripId,
      from_user: fromUserId,
      to_user: toUserId,
      amount: transactionAmount,
      currency,
    });
    hapticSuccess();
    await load();
    onChanged?.();
    setSettling(null);
  }

  const rawRatio = budgetTotal ? totalSpent / budgetTotal : 0;
  const progressRatio = Math.min(1, rawRatio);
  const ringColor = budgetTotal === null ? colors.accent : rawRatio > 1 ? colors.danger : rawRatio >= 0.8 ? colors.warning : colors.success;

  function toggleParticipant(id: string) {
    setParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    const amountValue = Number(amount.replace(',', '.'));
    if (!description.trim()) {
      Alert.alert('Manca la descrizione', 'Inserisci una descrizione per la spesa.');
      return;
    }
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Importo non valido', 'Inserisci un importo maggiore di zero.');
      return;
    }
    if (!paidBy) {
      Alert.alert('Manca chi ha pagato', 'Seleziona chi ha pagato questa spesa.');
      return;
    }
    if (participants.size === 0) {
      Alert.alert('Manca tra chi dividere', 'Seleziona almeno una persona tra cui dividere la spesa.');
      return;
    }
    setSaving(true);

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        paid_by: paidBy,
        description: description.trim(),
        amount: amountValue,
        currency,
        category,
        split_type: 'equal',
      })
      .select()
      .single();

    if (!error && expense) {
      const participantIds = Array.from(participants);
      const share = Math.floor((amountValue / participantIds.length) * 100) / 100;
      const remainder = Math.round((amountValue - share * participantIds.length) * 100) / 100;

      const splitPayload = participantIds.map((uid, index) => ({
        expense_id: (expense as Expense).id,
        user_id: uid,
        amount_owed: index === 0 ? share + remainder : share,
      }));

      await supabase.from('expense_splits').insert(splitPayload);

      hapticSuccess();
      setDescription('');
      setAmount('');
      setCategory('other');
      setModalVisible(false);
      await load();
      onChanged?.();
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

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>Totale speso</Text>
          <Text style={styles.summarySpent}>{formatAmount(animatedTotalSpent, currency)}</Text>
          {budgetTotal !== null && (
            <Text style={styles.summaryTotal}>di {formatAmount(budgetTotal, currency)}</Text>
          )}
        </View>
        {budgetTotal !== null && (
          <ProgressRing progress={progressRatio} color={ringColor}>
            <Text style={styles.ringLabel}>{Math.round(progressRatio * 100)}%</Text>
          </ProgressRing>
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Il tuo saldo</Text>
        {(() => {
          const mine = balances.find((b) => b.userId === userId);
          const net = mine?.net ?? 0;
          if (Math.abs(net) < 0.01) {
            return <Text style={styles.emptyText}>Sei in pari con il gruppo.</Text>;
          }
          return (
            <Text style={[styles.myBalance, net > 0 ? styles.myBalancePositive : styles.myBalanceNegative]}>
              {net > 0 ? 'Devi ricevere ' : 'Devi dare '}
              {formatAmount(Math.abs(net), currency)}
            </Text>
          );
        })()}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Saldi semplificati</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Il gruppo è in pari.</Text>
        ) : (
          transactions.map((t, i) => {
            const key = `${t.fromUserId}-${t.toUserId}`;
            return (
              <View key={i} style={styles.balanceRow}>
                <Text style={styles.balanceText}>
                  {t.fromName} deve {formatAmount(t.amount, currency)} a {t.toName}
                </Text>
                <TouchableOpacity
                  style={styles.settleButton}
                  onPress={() => handleSettle(t.fromUserId, t.toUserId, t.amount)}
                  disabled={settling === key}
                >
                  <Text style={styles.settleButtonText}>{settling === key ? 'Salvo...' : 'Segna come saldato'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Spese</Text>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna spesa registrata.</Text>
        ) : (
          expenses.map((e) => {
            const cat = CATEGORIES.find((c) => c.key === e.category);
            const payer = members.find((m) => m.userId === e.paid_by);
            return (
              <View key={e.id} style={styles.expenseCard}>
                <Text style={styles.expenseEmoji}>{cat?.emoji ?? '💳'}</Text>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseDescription}>{e.description}</Text>
                  <Text style={styles.expenseMeta}>Pagato da {payer?.name ?? 'qualcuno'}</Text>
                </View>
                <Text style={styles.expenseAmount}>{formatAmount(Number(e.amount), e.currency)}</Text>
              </View>
            );
          })
        )}
      </View>

      <GradientButton label="+ Aggiungi spesa" onPress={() => setModalVisible(true)} />

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nuova spesa</Text>
            <TextInput
              style={styles.input}
              placeholder="Descrizione"
              placeholderTextColor={colors.textMuted}
              value={description}
              onChangeText={setDescription}
            />
            <TextInput
              style={styles.input}
              placeholder="Importo"
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, category === cat.key && styles.chipSelected]}
                  onPress={() => setCategory(cat.key)}
                >
                  <Text style={[styles.chipText, category === cat.key && styles.chipTextSelected]}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Pagato da</Text>
            <View style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={[styles.chip, paidBy === m.userId && styles.chipSelected]}
                  onPress={() => setPaidBy(m.userId)}
                >
                  <Text style={[styles.chipText, paidBy === m.userId && styles.chipTextSelected]}>
                    {m.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Diviso tra</Text>
            <View style={styles.chipRow}>
              {members.map((m) => (
                <TouchableOpacity
                  key={m.userId}
                  style={[styles.chip, participants.has(m.userId) && styles.chipSelected]}
                  onPress={() => toggleParticipant(m.userId)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      participants.has(m.userId) && styles.chipTextSelected,
                    ]}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
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
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  container: { gap: spacing.lg },
  emptyText: { ...typography.body, color: colors.textMuted },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLeft: { gap: 2 },
  summaryLabel: { ...typography.caption, color: colors.textMuted },
  summarySpent: { ...typography.monoLg, color: colors.text },
  summaryTotal: { ...typography.monoSm, color: colors.textMuted },
  ringLabel: { ...typography.body, fontWeight: '700', color: colors.text },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  myBalance: { ...typography.monoLg, fontSize: 20 },
  myBalancePositive: { color: colors.success },
  myBalanceNegative: { color: colors.danger },
  balanceRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  balanceText: { ...typography.body, color: colors.text },
  settleButton: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  settleButtonText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  expenseEmoji: { fontSize: 22 },
  expenseInfo: { flex: 1 },
  expenseDescription: { ...typography.body, color: colors.text, fontWeight: '600' },
  expenseMeta: { ...typography.caption, color: colors.textMuted },
  expenseAmount: { ...typography.monoSm, color: colors.text },
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
