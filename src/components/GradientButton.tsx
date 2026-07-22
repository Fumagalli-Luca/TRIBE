import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import PressableScale from './PressableScale';
import { colors, gradients, radius, typography } from '../constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function GradientButton({ label, onPress, loading, disabled, style }: Props) {
  const isDisabled = disabled || loading;

  return (
    <PressableScale onPress={onPress} disabled={isDisabled} style={[styles.wrapper, style]}>
      <LinearGradient
        colors={gradients.primaryButton}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, isDisabled && styles.disabled]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrapper: { borderRadius: radius.buttonPrimary, overflow: 'hidden' },
  gradient: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  label: { ...typography.body, fontSize: 16, fontWeight: '600', color: colors.text },
});
