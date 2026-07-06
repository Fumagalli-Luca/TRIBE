import { StyleSheet, Text, View } from 'react-native';
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
  return (
    <View style={styles.hub}>
      {/* linee dal centro a ogni nodo */}
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

      {/* nodi esterni */}
      {NODE_ANGLES.map((angle, i) => {
        const { x, y } = polarOffset(angle, NODE_RADIUS);
        return (
          <View
            key={`node-${i}`}
            style={[
              styles.node,
              { left: HUB_CENTER + x - 7, top: HUB_CENTER + y - 7 },
            ]}
          />
        );
      })}

      {/* nodo centrale */}
      <View style={[styles.centerNode, { left: HUB_CENTER - 13, top: HUB_CENTER - 13 }]} />
    </View>
  );
}

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <NetworkIcon />
      <Text style={styles.wordmark}>TRIBE</Text>
      <Text style={styles.tagline}>Il tuo viaggio.{'\n'}Organizzato. Insieme.</Text>
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
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
