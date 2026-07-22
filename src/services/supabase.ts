import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Cliente único de Supabase (capa de acceso a datos, ver `docs/architecture.md`).
 *
 * Lee la URL y la anon key exclusivamente de `EXPO_PUBLIC_SUPABASE_URL` y
 * `EXPO_PUBLIC_SUPABASE_ANON_KEY` (inyectadas por Expo en el bundle). Nunca hay
 * credenciales literales en el código: si falta alguna variable, falla con un
 * error claro en lugar de crear un cliente con valores vacíos.
 *
 * No se instancia el cliente desde componentes: cualquier otra capa de la app
 * debe importar `supabase` desde aquí.
 *
 * Sesión persistida en `AsyncStorage` con flujo PKCE (`f-011-auth-google-sso`):
 * `detectSessionInUrl` va a `false` porque el flujo nativo (`expo-web-browser`)
 * intercambia el `code` manualmente en `src/services/auth.ts`, no hay URL de
 * navegador que Supabase pueda inspeccionar.
 */

function readEnvVar(name: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Copia .env.example a .env.local y rellena su valor con las credenciales del proyecto Supabase.`
    );
  }
  return value;
}

const supabaseUrl = readEnvVar('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnonKey = readEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
