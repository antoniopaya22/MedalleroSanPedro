import { Platform } from 'react-native';
import type { ColorScheme } from './colors';

export interface ShadowStyle {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

function shadow(scheme: ColorScheme, offsetY: number, radius: number, elevation: number): ShadowStyle {
  return {
    // Sombra cálida (marrón tierra) en claro en vez de un negro/azul frío, a
    // juego con la paleta páramo; en oscuro se mantiene negro puro.
    shadowColor: scheme === 'dark' ? '#000000' : '#2B1B0E',
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: scheme === 'dark' ? 0.4 : 0.1,
    shadowRadius: radius,
    elevation: Platform.OS === 'android' ? elevation : 0,
  };
}

export function getShadows(scheme: ColorScheme) {
  return {
    none: shadow(scheme, 0, 0, 0),
    sm: shadow(scheme, 2, 6, 2),
    md: shadow(scheme, 6, 14, 4),
    lg: shadow(scheme, 12, 24, 8),
  } as const;
}

export type Shadows = ReturnType<typeof getShadows>;
