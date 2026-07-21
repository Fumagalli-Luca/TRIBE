import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface Props extends PressableProps {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function PressableScale({ style, children, ...pressableProps }: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[style, animatedStyle]}
      onPressIn={(e) => {
        scale.value = withTiming(0.96, { duration: 100 });
        pressableProps.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, { duration: 150 });
        pressableProps.onPressOut?.(e);
      }}
      {...pressableProps}
    >
      {children}
    </AnimatedPressable>
  );
}
