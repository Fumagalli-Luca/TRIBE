import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { UserMinus, LogOut } from 'lucide-react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { hapticSelect } from '../../../lib/haptics';
import Avatar from '../../../components/Avatar';
import GradientButton from '../../../components/GradientButton';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/RootNavigator';

interface Props {
  tripId: string;
  navigation: NativeStackNavigationProp<RootStackParamList, 'TripOverview'>;
  onChanged?: () => void;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function formatAmount(n: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  return `${sign}${Math.abs(n).toFixed(2)}${symbol}`;
}

export default function GroupTab({ tripId, navigation, onChanged }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [currency, setCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

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
      .select('invite_code, currency')
      .eq('id', tripId)
      .single();
    const tripRow = trip as { invite_code: string | null; currency: string } | null;
    setInviteCode(tripRow?.invite_code ?? null);
    setCurrency(tripRow?.currency ?? 'EUR');

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('id, user_id, role, status, user:users!trip_members_user_id_fkey(full_name, avatar_url)')
      .eq('trip_id', tripId);
    const memberList = (memberRows as unknown as Member[]) ?? [];
    setMembers(memberList);

    const { data: expenseRows } = await supabase
      .from('expenses')
      .select('id, paid_by, amount')
      .eq('trip_id', tripId);
    const expenses = (expenseRows as { id: string; paid_by: string; amount: number }[]) ?? [];

    let splits: { user_id: string; amount_owed: number }[] = [];
    if (expenses.length > 0) {
      const { data: splitRows } = await supabase
        .from('expense_splits')
        .select('user_id, amount_owed')
        .in('expense_id', expenses.map((e) => e.id));
      splits = (splitRows as { user_id: string; amount_owed: number }[]) ?? [];
    }

    const { data: settlementRows } = await supabase
      .from('settlements')
      .select('from_user, to_user, amount')
      .eq('trip_id', tripId);
    const settlements = (settlementRows as { from_user: string; to_user: string; amount: number }[]) ?? [];

    const net = new Map<string, number>();
    for (const m of memberList) net.set(m.user_id, 0);
    for (const e of expenses) net.set(e.paid_by, (net.get(e.paid_by) ?? 0) + Number(e.amount));
    for (const s of splits) net.set(s.user_id, (net.get(s.user_id) ?? 0) - Number(s.amount_owed));
    for (const s of settlements) {
      net.set(s.from_user, (net.get(s.from_user) ?? 0) + Number(s.amount));
      net.set(s.to_user, (net.get(s.to_user) ?? 0) - Number(s.amount));
    }
    setBalances(net);

    setLoading(false);
  }

  async function handleShare() {
    if (!inviteCode) return;
    await Share.share({
      message: `Unisciti al mio viaggio su TRIBE! Codice invito: ${inviteCode}`,
    });
  }

  function handleRemoveMember(member: Member) {
    Alert.alert(
      'Rimuovi membro',
      `Rimuovere ${member.user?.full_name ?? 'questo utente'} dal viaggio?`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('trip_members').delete().eq('id', member.id);
            hapticSelect();
            setMembers((prev) => prev.filter((m) => m.id !== member.id));
            onChanged?.();
          },
        },
      ]
    );
  }

  function handleLeaveTrip() {
    const me = members.find((m) => m.user_id === userId);
    if (!me) return;
    Alert.alert('Lascia il viaggio', 'Sei sicuro di voler uscire da questo viaggio?', [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Esci',
        style: 'destructive',
        onPress: async () => {
          await supabase.from('trip_members').delete().eq('id', me.id);
          navigation.replace('Home');
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const isAdmin = members.some((m) => m.user_id === userId && m.role === 'admin');

  return (
    <View style={styles.container}>
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Codice invito</Text>
        <Text style={styles.inviteCode}>{inviteCode ?? '——————'}</Text>
        {inviteCode && (
          <View style={styles.qrWrapper}>
            <QRCode value={inviteCode} size={110} color={colors.background} backgroundColor={colors.text} />
          </View>
        )}
        <GradientButton label="Condividi invito" onPress={handleShare} style={styles.shareButton} />
      </View>

      <Text style={styles.sectionTitle}>Membri ({members.length})</Text>

      {members.map((member) => {
        const net = balances.get(member.user_id) ?? 0;
        const isMe = member.user_id === userId;
        return (
          <View key={member.id} style={styles.memberRow}>
            <Avatar name={member.user?.full_name ?? null} uri={member.user?.avatar_url} size={44} />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.user?.full_name ?? 'Utente'}</Text>
              <Text style={styles.memberRole}>
                {member.role === 'admin' ? 'Admin' : 'Membro'}
                {member.status === 'pending' ? ' · in attesa' : ''}
              </Text>
            </View>
            {Math.abs(net) > 0.01 && (
              <Text style={[styles.balance, net > 0 ? styles.balancePositive : styles.balanceNegative]}>
                {formatAmount(net, currency)}
              </Text>
            )}
            {isAdmin && !isMe && (
              <TouchableOpacity
                onPress={() => handleRemoveMember(member)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.memberAction}
              >
                <UserMinus size={18} color={colors.danger} />
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <TouchableOpacity style={styles.leaveRow} onPress={handleLeaveTrip}>
        <LogOut size={18} color={colors.danger} />
        <Text style={styles.leaveText}>Lascia il viaggio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { paddingVertical: spacing.xl, alignItems: 'center' },
  container: { gap: spacing.lg },
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  inviteLabel: { ...typography.caption, color: colors.textMuted },
  inviteCode: { ...typography.monoLg, color: colors.accent, letterSpacing: 6, fontSize: 28 },
  qrWrapper: { padding: spacing.sm, backgroundColor: colors.text, borderRadius: radius.buttonPrimary },
  shareButton: { width: '100%', marginTop: spacing.xs },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, color: colors.text, fontWeight: '600' },
  memberRole: { ...typography.caption, color: colors.textMuted },
  balance: { ...typography.monoSm },
  balancePositive: { color: colors.success },
  balanceNegative: { color: colors.danger },
  memberAction: { padding: spacing.xs },
  leaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  leaveText: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
