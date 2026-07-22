import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useColorScheme as useDeviceColorScheme } from '@/hooks/use-color-scheme';
import { Colors, type ColorScheme, type ThemeColors } from './colors';
import { getShadows, type Shadows } from './shadows';
import { Radius, Spacing, TouchTarget } from './spacing';
import { Typography } from './typography';

export type SchemePreference = ColorScheme | 'system';

const SCHEME_PREFERENCE_KEY = 'medallerosanpedro.themePreference';

export interface Theme {
  scheme: ColorScheme;
  preference: SchemePreference;
  colors: ThemeColors;
  spacing: typeof Spacing;
  radius: typeof Radius;
  touchTarget: typeof TouchTarget;
  typography: typeof Typography;
  shadows: Shadows;
  setPreference: (preference: SchemePreference) => void;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useDeviceColorScheme();
  // Por defecto claro: el tema oscuro solo se activa si el usuario lo elige explícitamente.
  const [preference, setPreferenceState] = useState<SchemePreference>('light');

  useEffect(() => {
    AsyncStorage.getItem(SCHEME_PREFERENCE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setPreferenceState(stored);
      }
    });
  }, []);

  const setPreference = (next: SchemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(SCHEME_PREFERENCE_KEY, next).catch(() => {});
  };

  const scheme: ColorScheme = preference === 'system' ? (deviceScheme === 'dark' ? 'dark' : 'light') : preference;

  const value = useMemo<Theme>(
    () => ({
      scheme,
      preference,
      colors: Colors[scheme],
      spacing: Spacing,
      radius: Radius,
      touchTarget: TouchTarget,
      typography: Typography,
      shadows: getShadows(scheme),
      setPreference,
    }),
    [scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}
