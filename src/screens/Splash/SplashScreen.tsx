import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { colors, spacing, typography } from '../../constants/theme';

const HUB_SIZE = 160;
const HUB_CENTER = HUB_SIZE / 2;
const NODE_RADIUS = 65;
const NODE_ANGLES = [-90, -18, 54, 126, 198]; // pentagono, come nel mockup

function polarOffset(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

function NetworkIcon() {
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 14000, easing: Easing.linear }), -1);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1
    );
  }, []);

  const hubStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const centerNodeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.hub, hubStyle]}>
      {NODE_ANGLES.map((angle, i) => (
        <View
          key={`line-${i}`}
          style={[
            styles.linePivot,
            { left: HUB_CENTER, top: HUB_CENTER, transform: [{ rotate: `${angle}deg` }] },
          ]}
        >
          <View style={[styles.line, { width: NODE_RADIUS }]} />
        </View>
      ))}

      {NODE_ANGLES.map((angle, i) => {
        const { x, y } = polarOffset(angle, NODE_RADIUS);
        return (
          <View
            key={`node-${i}`}
            style={[styles.node, { left: HUB_CENTER + x - 7, top: HUB_CENTER + y - 7 }]}
          />
        );
      })}

      <Animated.View
        style={[styles.centerNode, centerNodeStyle, { left: HUB_CENTER - 13, top: HUB_CENTER - 13 }]}
      />
    </Animated.View>
  );
}

export default function SplashScreen() {
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(12);

  useEffect(() => {
    textOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(300, withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) }));
  }, []);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      <NetworkIcon />
      <Animated.View style={textStyle}>
        <Text style={styles.wordmark}>TRIBE</Text>
        <Text style={styles.tagline}>Il tuo viaggio.{'\n'}Organizzato. Insieme.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  hub: {
    width: HUB_SIZE,
    height: HUB_SIZE,
  },
  linePivot: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  line: {
    position: 'absolute',
    left: 0,
    top: -1,
    height: 2,
    backgroundColor: colors.accent,
    opacity: 0.55,
  },
  node: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },
  centerNode: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  wordmark: {
    ...typography.display,
    color: colors.text,
    letterSpacing: 6,
    textAlign: 'center',
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
