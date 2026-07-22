import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../constants/theme';

interface Props {
  name: string | null;
  uri?: string | null;
  size?: number;
}

export function initials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export default function Avatar({ name, uri, size = 40 }: Props) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, dimension]}>
      {uri ? (
        <Image source={{ uri }} style={dimension} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.background,
  },
  initials: { ...typography.body, fontWeight: '700', color: colors.text },
});
