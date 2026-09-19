import { Platform, StyleSheet } from 'react-native';

export const Palette = {
  cyan: '#00D1FF',
  sky: '#0099FF',
  blue: '#007BFF',
  electric: '#005EFF',
  navy: '#003A9E',
  mint: '#00E5B8',
  green: '#00C896',
  amber: '#FFB020',
  orange: '#FF7A00',
  red: '#FF3B30',
  pink: '#F72D8A',
  purple: '#AB55F7',
  white: '#E5E7EB',
  muted: '#94A3B8',
  steel: '#64748B',
  border: '#334155',
  surface: '#132238',
  surfaceRaised: '#1A2B44',
  background: '#0B1220',
  backgroundDeep: '#01182D',
} as const;

export const Colors = {
  light: {
    text: '#0B1220',
    background: '#F7FAFF',
    backgroundElement: '#E8F0FA',
    backgroundSelected: '#D6E7FF',
    textSecondary: '#52647B',
  },
  dark: {
    text: Palette.white,
    background: Palette.background,
    backgroundElement: Palette.surface,
    backgroundSelected: Palette.surfaceRaised,
    textSecondary: Palette.muted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const FontFamily = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extraBold: 'Inter_800ExtraBold',
  mono: Platform.select({ ios: 'ui-monospace', android: 'monospace', default: 'monospace' }),
} as const;

export const Fonts = {
  sans: FontFamily.regular,
  serif: 'serif',
  rounded: FontFamily.regular,
  mono: FontFamily.mono,
} as const;

export const Typography = {
  display: { fontFamily: FontFamily.extraBold, fontSize: 38, lineHeight: 44, letterSpacing: -1.25 },
  h1: { fontFamily: FontFamily.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  h2: { fontFamily: FontFamily.semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.45 },
  h3: { fontFamily: FontFamily.semibold, fontSize: 20, lineHeight: 26 },
  h4: { fontFamily: FontFamily.medium, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: FontFamily.regular, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: FontFamily.regular, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: FontFamily.medium, fontSize: 12, lineHeight: 16 },
  metric: { fontFamily: FontFamily.mono, fontSize: 12, lineHeight: 16 },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
  six: 24,
  seven: 32,
  eight: 40,
  nine: 48,
  ten: 64,
} as const;

export const Radius = { small: 10, medium: 14, large: 18, pill: 999 } as const;
export const Border = { hairline: StyleSheet.hairlineWidth, default: 1 } as const;
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
