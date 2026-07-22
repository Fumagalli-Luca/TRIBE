import { useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
  runOnJS,
} from 'react-native-reanimated';
import { colors, radius } from '../constants/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;
const MAX_ROTATION_DEG = 12;

interface Props {
  children: React.ReactNode;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  swipeSignal?: 'left' | 'right' | null;
}

export default function SwipeCard({ children, onSwipeLeft, onSwipeRight, swipeSignal }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  function fling(direction: 'left' | 'right') {
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
      if (finished) {
        translateX.value = 0;
        translateY.value = 0;
        runOnJS(direction === 'right' ? onSwipeRight : onSwipeLeft)();
      }
    });
  }

  useEffect(() => {
    if (swipeSignal) fling(swipeSignal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipeSignal]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.4;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const direction = e.translationX > 0 ? 'right' : 'left';
        const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        translateX.value = withTiming(toX, { duration: 220 }, (finished) => {
          if (finished) {
            translateX.value = 0;
            translateY.value = 0;
            runOnJS(direction === 'right' ? onSwipeRight : onSwipeLeft)();
          }
        });
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-MAX_ROTATION_DEG, 0, MAX_ROTATION_DEG],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(translateX.value), [0, SWIPE_THRESHOLD], [0, 0.35], Extrapolation.CLAMP),
    backgroundColor: translateX.value > 0 ? colors.success : colors.danger,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.card, cardStyle]}>
        {children}
        <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});
