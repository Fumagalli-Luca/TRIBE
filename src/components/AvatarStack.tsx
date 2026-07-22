import { StyleSheet, Text, View } from 'react-native';
import Avatar from './Avatar';
import { colors, typography } from '../constants/theme';

interface Member {
  name: string | null;
  avatarUrl?: string | null;
}

interface Props {
  members: Member[];
  size?: number;
  max?: number;
}

export default function AvatarStack({ members, size = 32, max = 4 }: Props) {
  const visible = members.slice(0, max);
  const overflow = members.length - visible.length;

  return (
    <View style={styles.row}>
      {visible.map((m, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar name={m.name} uri={m.avatarUrl} size={size} />
        </View>
      ))}
      {overflow > 0 && (
        <View style={[styles.overflow, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3 }]}>
          <Text style={styles.overflowText}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  overflow: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { ...typography.caption, color: colors.textMuted, fontWeight: '600', fontSize: 11 },
});
