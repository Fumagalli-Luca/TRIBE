import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { isBiometricAvailable } from '../../lib/biometrics';
import { getBiometricEnabled, setBiometricEnabled } from '../../lib/biometricPreference';
import { colors, radius, spacing, typography } from '../../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Security'>;

export default function SecurityScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setSupported);
    getBiometricEnabled().then(setEnabled);
  }, []);

  async function handleToggle(value: boolean) {
    setEnabled(value);
    await setBiometricEnabled(value);
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sicurezza</Text>
        <View style={{ width: 24 }} />
      </View>

      {supported ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Accedi con Face ID / Touch ID</Text>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>
          <Text style={styles.hint}>
            Se attivo, ti verrà chiesto Face ID/Touch ID a ogni apertura dell'app dopo un
            riavvio, al posto del login manuale.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.hint}>
            Il tuo dispositivo o l'ambiente di sviluppo attuale non supporta Face ID/Touch ID.
            Nota: Face ID non funziona dentro Expo Go, serve una build reale dell'app.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg, gap: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backText: { ...typography.h1, color: colors.text },
  headerTitle: { ...typography.h2, color: colors.text },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { ...typography.body, color: colors.text, flex: 1, marginRight: spacing.sm },
  hint: { ...typography.caption, color: colors.textMuted },
});
