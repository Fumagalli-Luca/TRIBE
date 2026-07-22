import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isBiometricAvailable, authenticateBiometric } from '../lib/biometrics';
import {
  getBiometricEnabled,
  setBiometricEnabled,
  hasAskedBiometric,
  setAskedBiometric,
} from '../lib/biometricPreference';
import { colors } from '../constants/theme';
import SplashScreen from '../screens/Splash/SplashScreen';
import LoginScreen from '../screens/Login/LoginScreen';
import RegisterScreen from '../screens/Register/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmail/VerifyEmailScreen';
import ForgotPasswordScreen from '../screens/ForgotPassword/ForgotPasswordScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import EditProfileScreen from '../screens/EditProfile/EditProfileScreen';
import SecurityScreen from '../screens/Security/SecurityScreen';
import CreateTripScreen from '../screens/CreateTrip/CreateTripScreen';
import AILoadingScreen from '../screens/CreateTrip/AILoadingScreen';
import TripOverviewScreen from '../screens/TripOverview/TripOverviewScreen';
import JoinTripScreen from '../screens/JoinTrip/JoinTripScreen';
import VotingScreen from '../screens/Voting/VotingScreen';
import AppLockScreen from '../screens/AppLock/AppLockScreen';
import type { TripGeneratorPayload } from '../types/tripGenerator';

export interface PendingProfileData {
  avatarUri: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  birthDate: string | null;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyEmail: { email: string; mode: 'signup' | 'reconfirm'; pendingProfile?: PendingProfileData };
  ForgotPassword: undefined;
  Onboarding: undefined;
  Home: undefined;
  Profile: undefined;
  EditProfile: undefined;
  Security: undefined;
  CreateTrip: undefined;
  AILoading: { payload: TripGeneratorPayload };
  TripOverview: { tripId: string };
  JoinTrip: undefined;
  Voting: { tripId: string; voteId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Navigation prop condiviso dai tab embedded nella Home (§4.4 bottom nav). */
export type HomeNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

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

function promptEnableBiometric() {
  Alert.alert(
    'Accesso più veloce?',
    'Vuoi usare Face ID / Touch ID per accedere a TRIBE la prossima volta?',
    [
      { text: 'No, grazie', style: 'cancel', onPress: () => setAskedBiometric() },
      {
        text: 'Sì, attiva',
        onPress: async () => {
          await setBiometricEnabled(true);
          await setAskedBiometric();
        },
      },
    ]
  );
}

export default function RootNavigator() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Lucchetto biometrico: si applica solo se l'utente ha scelto di
  // attivarlo (preferenza persistita), non semplicemente perché il
  // dispositivo lo supporta.
  const [locked, setLocked] = useState(false);
  const [biometricChecked, setBiometricChecked] = useState(false);

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
        fetchProfile(data.session.user.id);

        const enabled = await getBiometricEnabled();
        if (enabled) {
          setLocked(true);
          const success = await authenticateBiometric();
          if (success) setLocked(false);
        }
      }
      setBiometricChecked(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (newSession) {
        fetchProfile(newSession.user.id);

        // Dopo un login/registrazione appena fatti (non un semplice
        // ripristino sessione all'avvio), proponiamo Face ID una sola
        // volta, se il dispositivo lo supporta.
        if (event === 'SIGNED_IN') {
          const alreadyAsked = await hasAskedBiometric();
          if (!alreadyAsked) {
            const available = await isBiometricAvailable();
            if (available) promptEnableBiometric();
            else await setAskedBiometric();
          }
        }
      } else {
        setProfile(null);
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
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="AILoading" component={AILoadingScreen} />
            <Stack.Screen name="TripOverview" component={TripOverviewScreen} />
            <Stack.Screen name="JoinTrip" component={JoinTripScreen} />
            <Stack.Screen name="Voting" component={VotingScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Security" component={SecurityScreen} />
            <Stack.Screen
              name="CreateTrip"
              component={CreateTripScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="AILoading" component={AILoadingScreen} />
            <Stack.Screen name="TripOverview" component={TripOverviewScreen} />
            <Stack.Screen name="JoinTrip" component={JoinTripScreen} />
            <Stack.Screen name="Voting" component={VotingScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
