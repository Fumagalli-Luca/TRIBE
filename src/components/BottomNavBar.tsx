import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell, Compass, House, Plus, User } from 'lucide-react-native';
import { colors, spacing } from '../constants/theme';

export type MainTabKey = 'home' | 'trips' | 'notifications' | 'profile';

interface Props {
  active: MainTabKey;
  onSelect: (tab: MainTabKey) => void;
  onCreate: () => void;
  notificationCount?: number;
}

const ICON_SIZE = 24;

export default function BottomNavBar({ active, onSelect, onCreate, notificationCount = 0 }: Props) {
  const insets = useSafeAreaInsets();

  function iconColor(key: MainTabKey) {
    return active === key ? colors.accent : colors.textMuted;
  }

  return (
    <BlurView intensity={40} tint="dark" style={[styles.container, { paddingBottom: insets.bottom || spacing.sm }]}>
      <TouchableOpacity style={styles.tab} onPress={() => onSelect('home')}>
        <House size={ICON_SIZE} color={iconColor('home')} style={active === 'home' && styles.scaled} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onSelect('trips')}>
        <Compass size={ICON_SIZE} color={iconColor('trips')} style={active === 'trips' && styles.scaled} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.fab} onPress={onCreate}>
        <Plus size={26} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onSelect('notifications')}>
        <View>
          <Bell
            size={ICON_SIZE}
            color={iconColor('notifications')}
            style={active === 'notifications' && styles.scaled}
          />
          {notificationCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.tab} onPress={() => onSelect('profile')}>
        <User size={ICON_SIZE} color={iconColor('profile')} style={active === 'profile' && styles.scaled} />
      </TouchableOpacity>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,22,34,0.72)',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
  scaled: { transform: [{ scale: 1.1 }] },
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '700', color: colors.text },
});
