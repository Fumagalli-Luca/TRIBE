import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isBiometricAvailable, authenticateBiometric } from '../lib/biometrics';
import { colors } from '../constants/theme';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import RegisterScreen from '../screens/Register/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmail/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPassword/ForgotPasswordScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import CreateTripScreen from '../screens/CreateTrip/CreateTripScreen';
import AILoadingScreen from '../screens/CreateTrip/AILoadingScreen';
import TripOverviewScreen from '../screens/TripOverview/TripOverviewScreen';
import AppLockScreen from '../screens/AppLock/AppLockScreen';
import type { TripGeneratorPayload } from '../types/tripGenerator';

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; mode: 'signup' | 'reconfirm' };
  ForgotPassword: undefined;
  Onboarding: undefined;
  Home: undefined;
  Profile: undefined;
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

  // Lucchetto biometrico: si applica solo alla sessione già persistita
  // trovata all'avvio a freddo dell'app (non subito dopo un login manuale,
  // dato che l'utente ha appena dimostrato la propria identità con la
  // password). "checked" distingue "non ancora verificato" da "verificato
  // e non serve" per evitare di mostrare la Splash all'infinito se il
  // dispositivo non ha biometria configurata.
  const [locked, setLocked] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);
  const wasRestoredSession = useRef(false);

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
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) {
        wasRestoredSession.current = true;
        fetchProfile(data.session.user.id);

        const available = await isBiometricAvailable();
        if (available) {
          setLocked(true);
          const success = await authenticateBiometric();
          if (success) setLocked(false);
        }
        setBiometricChecked(true);
      } else {
        setBiometricChecked(true);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
        wasRestoredSession.current = false;
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, [fetchProfile]);

  async function retryUnlock() {
    const success = await authenticateBiometric();
    if (success) setLocked(false);
  }

  const showSplash =
    authLoading || !biometricChecked || (session && !profile && profileLoading);
  if (showSplash) {
    return <SplashScreen />;
  }

  if (session && locked) {
    return <AppLockScreen onRetry={retryUnlock} />;
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
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : !profile?.onboarding_completed ? (
          <>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
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
            <Stack.Screen name="Profile" component={ProfileScreen} />
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
