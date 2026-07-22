export type ColorScheme = 'light' | 'dark';

// Paleta inspirada en el Páramo leonés: trigo/oro de las eras, tierra y
// terracota de los tejados y adobes, amapola como acento cálido.
export const palette = {
  wheat50: '#FBF6EC',
  wheat100: '#F5E9CE',
  wheat200: '#EDD9A8',
  wheat300: '#E4C87F',
  wheat400: '#DDAE49',
  wheat500: '#C8922E',
  wheat600: '#A8741F',
  wheat700: '#8A5D18',

  terracotta300: '#E8896B',
  terracotta400: '#DD6B45',
  terracotta500: '#C8502B',
  terracotta600: '#A83E20',

  earth900: '#1E140A',
  earth800: '#2B1D10',
  earth700: '#3A2818',
  earth600: '#4A3420',
  earth500: '#5C4227',

  stone50: '#FAF7F2',
  stone100: '#F2ECE0',
  stone200: '#E4DAC5',
  stone300: '#CFC0A0',
  stone400: '#A6976F',
  stone500: '#79694A',
  stone600: '#544935',
  stone900: '#241D12',

  white: '#FFFFFF',
  black: '#000000',

  green500: '#3F7D20',
  green400: '#7CB251',
  amber500: '#B8791A',
  amber400: '#E0A23D',
  red500: '#C0392B',
  red400: '#E4685A',
  blue500: '#3B6E8C',
  blue400: '#6FA0BC',

  gold500: '#D9A62E',
  gold400: '#E8C158',
  silver500: '#9AA1A9',
  silver400: '#C7CDD3',
  bronze500: '#A8763E',
  bronze400: '#C99A62',
} as const;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  borderStrong: string;

  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  primary: string;
  primaryMuted: string;
  onPrimary: string;
  gradientFrom: string;
  gradientTo: string;

  accent: string;
  onAccent: string;

  success: string;
  warning: string;
  danger: string;
  info: string;

  medalGold: string;
  medalSilver: string;
  medalBronze: string;

  overlay: string;
}

export const Colors: Record<ColorScheme, ThemeColors> = {
  light: {
    background: palette.stone50,
    surface: palette.white,
    surfaceAlt: palette.stone100,
    border: palette.stone200,
    borderStrong: palette.stone300,

    textPrimary: palette.stone900,
    textSecondary: palette.stone500,
    textTertiary: palette.stone400,
    textInverse: palette.white,

    primary: palette.wheat600,
    primaryMuted: palette.wheat100,
    onPrimary: palette.white,
    gradientFrom: palette.wheat400,
    gradientTo: palette.terracotta500,

    accent: palette.terracotta500,
    onAccent: palette.white,

    success: palette.green500,
    warning: palette.amber500,
    danger: palette.red500,
    info: palette.blue500,

    medalGold: palette.gold500,
    medalSilver: palette.silver500,
    medalBronze: palette.bronze500,

    overlay: 'rgba(30, 20, 10, 0.5)',
  },
  dark: {
    background: palette.earth900,
    surface: palette.earth700,
    surfaceAlt: palette.earth600,
    border: palette.earth500,
    borderStrong: palette.stone600,

    textPrimary: '#F7EFE0',
    textSecondary: '#D8C8A8',
    textTertiary: '#9C8A68',
    textInverse: palette.stone900,

    primary: palette.wheat400,
    primaryMuted: 'rgba(221, 174, 73, 0.18)',
    onPrimary: palette.earth900,
    gradientFrom: palette.wheat400,
    gradientTo: palette.terracotta400,

    accent: palette.terracotta400,
    onAccent: palette.earth900,

    success: palette.green400,
    warning: palette.amber400,
    danger: palette.red400,
    info: palette.blue400,

    medalGold: palette.gold400,
    medalSilver: palette.silver400,
    medalBronze: palette.bronze400,

    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};
