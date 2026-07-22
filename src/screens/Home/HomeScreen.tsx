import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { colors } from '../../constants/theme';
import BottomNavBar, { type MainTabKey } from '../../components/BottomNavBar';
import ProfileScreen from '../Profile/ProfileScreen';

type ProfileScreenProps = NativeStackScreenProps<RootStackParamList, 'Profile'>;
import DashboardTab from './DashboardTab';
import TripsTab from './TripsTab';
import NotificationsTab, { fetchPendingVoteCount } from './NotificationsTab';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation, route }: Props) {
  const [tab, setTab] = useState<MainTabKey>('home');
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchPendingVoteCount().then(setNotificationCount);
    });
    fetchPendingVoteCount().then(setNotificationCount);
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.flex}>
      {tab === 'home' && (
        <DashboardTab
          navigation={navigation}
          onOpenNotifications={() => setTab('notifications')}
          onOpenProfile={() => setTab('profile')}
        />
      )}
      {tab === 'trips' && <TripsTab navigation={navigation} />}
      {tab === 'notifications' && <NotificationsTab navigation={navigation} />}
      {tab === 'profile' && (
        <ProfileScreen
          navigation={navigation as unknown as ProfileScreenProps['navigation']}
          route={route as unknown as ProfileScreenProps['route']}
          onBack={() => setTab('home')}
        />
      )}

      <BottomNavBar
        active={tab}
        onSelect={setTab}
        onCreate={() => navigation.navigate('CreateTrip')}
        notificationCount={notificationCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
});
