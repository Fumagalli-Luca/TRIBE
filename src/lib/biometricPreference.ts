import AsyncStorage from '@react-native-async-storage/async-storage';

const ENABLED_KEY = 'tribe:biometric_enabled';
const ASKED_KEY = 'tribe:biometric_asked';

export async function getBiometricEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ENABLED_KEY);
  return value === 'true';
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
}

export async function hasAskedBiometric(): Promise<boolean> {
  const value = await AsyncStorage.getItem(ASKED_KEY);
  return value === 'true';
}

export async function setAskedBiometric(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, 'true');
}
