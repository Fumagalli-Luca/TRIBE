import { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { colors } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PIECE_COLORS = [colors.primary, colors.accent, colors.success, '#FBBF24', '#F472B6'];
const PIECE_COUNT = 24;

interface PieceConfig {
  left: number;
  color: string;
  delay: number;
  duration: number;
  rotationDeg: number;
  drift: number;
  size: number;
}

function makePieces(): PieceConfig[] {
  return Array.from({ length: PIECE_COUNT }, () => ({
    left: Math.random() * SCREEN_WIDTH,
    color: PIECE_COLORS[Math.floor(Math.random() * PIECE_COLORS.length)],
    delay: Math.random() * 200,
    duration: 1400 + Math.random() * 700,
    rotationDeg: Math.random() * 720 - 360,
    drift: Math.random() * 80 - 40,
    size: 6 + Math.random() * 6,
  }));
}

function ConfettiPiece({ config }: { config: PieceConfig }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, { duration: config.duration, easing: Easing.out(Easing.quad) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.9,
    transform: [
      { translateY: progress.value * 420 },
      { translateX: progress.value * config.drift },
      { rotate: `${progress.value * config.rotationDeg}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.piece,
        style,
        {
          left: config.left,
          backgroundColor: config.color,
          width: config.size,
          height: config.size * 1.6,
        },
      ]}
    />
  );
}

export default function Confetti() {
  const [pieces] = useState<PieceConfig[]>(makePieces);

  return (
    <View style={styles.container} pointerEvents="none">
      {pieces.map((config, i) => (
        <ConfettiPiece key={i} config={config} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  piece: { position: 'absolute', top: -20, borderRadius: 2 },
});
