import { useEffect, useMemo, useState } from 'react';
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
import { simplifyDebts, type MemberBalance } from '../../../lib/balances';
import type { Expense, ExpenseCategory, ExpenseSplit } from '../../../types/database';

interface Props {
  tripId: string;
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

export default function BudgetTab({ tripId }: Props) {
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('EUR');
  const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

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
      .select('user_id, status, user:users(full_name)')
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

    setLoading(false);
  }

  const totalSpent = useMemo(() => expenses.reduce((sum, e) => sum + Number(e.amount), 0), [expenses]);

  const balances: MemberBalance[] = useMemo(() => {
    return members.map((m) => {
      const paid = expenses
        .filter((e) => e.paid_by === m.userId)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const owed = splits
        .filter((s) => s.user_id === m.userId)
        .reduce((sum, s) => sum + Number(s.amount_owed), 0);
      return { userId: m.userId, name: m.name, net: paid - owed };
    });
  }, [members, expenses, splits]);

  const transactions = useMemo(() => simplifyDebts(balances), [balances]);
  const myTransactions = transactions.filter(
    (t) => t.fromUserId === userId || t.toUserId === userId
  );

  const progressRatio = budgetTotal ? Math.min(1, totalSpent / budgetTotal) : 0;
  const overBudget = budgetTotal !== null && totalSpent > budgetTotal;

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
    if (!description.trim() || !amountValue || amountValue <= 0 || !paidBy || participants.size === 0) {
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

      setDescription('');
      setAmount('');
      setCategory('other');
      setModalVisible(false);
      await load();
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
        <View style={styles.summaryRow}>
          <Text style={styles.summarySpent}>{formatAmount(totalSpent, currency)}</Text>
          {budgetTotal !== null && (
            <Text style={styles.summaryTotal}>/ {formatAmount(budgetTotal, currency)}</Text>
          )}
        </View>
        {budgetTotal !== null && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progressRatio * 100}%`,
                  backgroundColor: overBudget ? colors.danger : colors.success,
                },
              ]}
            />
          </View>
        )}
      </View>

      <View>
        <Text style={styles.sectionTitle}>Il tuo saldo</Text>
        {myTransactions.length === 0 ? (
          <Text style={styles.emptyText}>Sei in pari con il gruppo.</Text>
        ) : (
          myTransactions.map((t, i) => (
            <View key={i} style={styles.balanceRow}>
              <Text style={styles.balanceText}>
                {t.fromUserId === userId
                  ? `Devi dare ${formatAmount(t.amount, currency)} a ${t.toName}`
                  : `${t.fromName} ti deve dare ${formatAmount(t.amount, currency)}`}
              </Text>
            </View>
          ))
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

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.addButtonText}>+ Aggiungi spesa</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
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
        </View>
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
    gap: spacing.sm,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  summarySpent: { ...typography.monoLg, color: colors.text },
  summaryTotal: { ...typography.monoSm, color: colors.textMuted },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  progressFill: { height: 8 },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  balanceRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  balanceText: { ...typography.body, color: colors.text },
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
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
