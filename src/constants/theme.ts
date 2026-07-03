/**
 * TRIBE Design System
 * Dark mode first — nessuna versione light in V1.
 * Fonte: TRIBE Product Spec §2
 */

export const colors = {
  background: '#0B0B0F',
  surface: '#161622',
  primary: '#7C3AED',
  accent: '#38BDF8',
  success: '#22C55E',
  danger: '#EF4444',
  text: '#FFFFFF',
  textMuted: '#A1A1AA',
  border: '#26263A',
} as const;

export const gradients = {
  primaryButton: ['#7C3AED', '#38BDF8'] as const,
};

export const fonts = {
  ui: 'Inter',
  mono: 'JetBrainsMono',
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontFamily: fonts.ui, fontWeight: '700' as const },
  h1: { fontSize: 24, lineHeight: 32, fontFamily: fonts.ui, fontWeight: '600' as const },
  h2: { fontSize: 18, lineHeight: 24, fontFamily: fonts.ui, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontFamily: fonts.ui, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontFamily: fonts.ui, fontWeight: '400' as const },
  monoLg: { fontSize: 22, lineHeight: 28, fontFamily: fonts.mono, fontWeight: '700' as const },
  monoSm: { fontSize: 14, lineHeight: 20, fontFamily: fonts.mono, fontWeight: '500' as const },
};

export const radius = {
  card: 20,
  buttonPrimary: 16,
  chip: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const motion = {
  screenTransitionMs: 280,
  microInteractionMs: 150,
  aiLoadingLoopMs: 1400,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
};
