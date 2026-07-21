import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from '../constants/theme';

function FloatingBlob({
  color,
  size,
  startX,
  startY,
  rangeX,
  rangeY,
  duration,
}: {
  color: string;
  size: number;
  startX: number;
  startY: number;
  rangeX: number;
  rangeY: number;
  duration: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.sin) })
      ),
      -1
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: progress.value * rangeX },
      { translateY: progress.value * rangeY },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity: 0.35,
        },
        style,
      ]}
    />
  );
}

export default function AnimatedBackground() {
  return (
    <View style={styles.container} pointerEvents="none">
      <FloatingBlob
        color={colors.primary}
        size={220}
        startX={-60}
        startY={-40}
        rangeX={30}
        rangeY={40}
        duration={6000}
      />
      <FloatingBlob
        color={colors.accent}
        size={180}
        startX={220}
        startY={500}
        rangeX={-25}
        rangeY={-35}
        duration={7000}
      />
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
});
