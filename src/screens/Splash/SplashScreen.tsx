import { StyleSheet, Text, View } from 'react-native';
import { colors, typography } from '../../constants/theme';

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>TRIBE</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    ...typography.display,
    color: colors.text,
    letterSpacing: 2,
  },
});
