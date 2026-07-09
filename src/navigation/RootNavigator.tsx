import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { colors } from '../constants/theme';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import CreateTripScreen from '../screens/CreateTrip/CreateTripScreen';
import AILoadingScreen from '../screens/CreateTrip/AILoadingScreen';
import TripOverviewScreen from '../screens/TripOverview/TripOverviewScreen';
import type { TripGeneratorPayload } from '../types/tripGenerator';

export type RootStackParamList = {
  Login: undefined;
  Onboarding: undefined;
  Home: undefined;
  CreateTrip: undefined;
  AILoading: { payload: TripGeneratorPayload };
  TripOverview: { tripId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.surface,
    border: colors.border,
    primary: colors.primary,
    text: colors.text,
  },
};

type Profile = { onboarding_completed: boolean } | null;

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    const { data } = await supabase
      .from('users')
      .select('onboarding_completed')
      .eq('id', userId)
      .single();
    setProfile((data as Profile) ?? { onboarding_completed: false });
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) fetchProfile(data.session.user.id);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [fetchProfile]);

  const showSplash = authLoading || (session && !profile && profileLoading);
  if (showSplash) {
    return <SplashScreen />;
  }

  // Chiave dello Stack: forza un remount quando cambia lo stato che determina
  // la initialRouteName (login -> onboarding -> home), così React Navigation
  // riparte sempre dalla schermata giusta invece di restare bloccato sulla
  // initialRouteName decisa al primo mount.
  const stackKey = !session ? 'auth' : !profile?.onboarding_completed ? 'onboarding' : 'app';

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator key={stackKey} screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : !profile?.onboarding_completed ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="AILoading" component={AILoadingScreen} />
            <Stack.Screen name="TripOverview" component={TripOverviewScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="AILoading" component={AILoadingScreen} />
            <Stack.Screen name="TripOverview" component={TripOverviewScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
