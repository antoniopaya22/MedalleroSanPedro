export const FontFamily = {
  displayBold: 'Manrope_800ExtraBold',
  headingBold: 'Manrope_700Bold',
  headingSemiBold: 'Manrope_600SemiBold',
  headingMedium: 'Manrope_500Medium',
  bodyRegular: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
} as const;

export interface TextVariantStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing?: number;
}

export const Typography = {
  display: { fontFamily: FontFamily.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  h1: { fontFamily: FontFamily.headingBold, fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  h2: { fontFamily: FontFamily.headingBold, fontSize: 22, lineHeight: 28 },
  h3: { fontFamily: FontFamily.headingSemiBold, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: FontFamily.headingSemiBold, fontSize: 16, lineHeight: 22 },
  subtitle: { fontFamily: FontFamily.bodyMedium, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: FontFamily.bodyRegular, fontSize: 15, lineHeight: 22 },
  bodySmall: { fontFamily: FontFamily.bodyRegular, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: FontFamily.bodyMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.2 },
  button: { fontFamily: FontFamily.bodySemiBold, fontSize: 15, lineHeight: 20 },
  overline: { fontFamily: FontFamily.bodySemiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1 },
} as const satisfies Record<string, TextVariantStyle>;

export type TextVariant = keyof typeof Typography;
