import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';

interface Props {
  tripId: string;
}

interface Member {
  id: string;
  role: string;
  status: string;
  user: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default function GroupTab({ tripId }: Props) {
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    setLoading(true);

    const { data: trip } = await supabase
      .from('trips')
      .select('invite_code')
      .eq('id', tripId)
      .single();
    setInviteCode((trip as { invite_code: string | null } | null)?.invite_code ?? null);

    const { data: memberRows } = await supabase
      .from('trip_members')
      .select('id, role, status, user:users(full_name, avatar_url)')
      .eq('trip_id', tripId);

    setMembers((memberRows as unknown as Member[]) ?? []);
    setLoading(false);
  }

  async function handleShare() {
    if (!inviteCode) return;
    await Share.share({
      message: `Unisciti al mio viaggio su TRIBE! Codice invito: ${inviteCode}`,
    });
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
      <View style={styles.inviteCard}>
        <Text style={styles.inviteLabel}>Codice invito</Text>
        <Text style={styles.inviteCode}>{inviteCode ?? '——————'}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Condividi invito</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Membri ({members.length})</Text>

      {members.map((member) => (
        <View key={member.id} style={styles.memberRow}>
          <View style={styles.memberAvatar}>
            {member.user?.avatar_url ? (
              <Image source={{ uri: member.user.avatar_url }} style={styles.memberAvatarImage} />
            ) : (
              <Text style={styles.memberAvatarText}>{initials(member.user?.full_name ?? null)}</Text>
            )}
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{member.user?.full_name ?? 'Utente'}</Text>
            <Text style={styles.memberRole}>
              {member.role === 'admin' ? 'Admin' : 'Membro'}
              {member.status === 'pending' ? ' · in attesa' : ''}
            </Text>
          </View>
        </View>
      ))}
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
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.buttonPrimary,
    height: 44,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  shareButtonText: { ...typography.body, fontWeight: '600', color: colors.text },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: 'uppercase' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: { width: 44, height: 44 },
  memberAvatarText: { ...typography.body, fontWeight: '700', color: colors.text },
  memberInfo: { flex: 1 },
  memberName: { ...typography.body, color: colors.text, fontWeight: '600' },
  memberRole: { ...typography.caption, color: colors.textMuted },
});
