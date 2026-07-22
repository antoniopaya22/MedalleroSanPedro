import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * Flujo OAuth de Google (PKCE nativo), único método de login de la app
 * (R1.1–R1.3). El navegador del sistema hace el intercambio del `code`
 * manualmente porque `detectSessionInUrl` está desactivado en el cliente
 * (`src/services/supabase.ts`): no hay ningún secreto de Google en el
 * cliente, el proveedor se configura en el panel de Supabase.
 *
 * Requerido por `expo-web-browser` para cerrar correctamente el flujo cuando
 * la app vuelve de primer plano tras el redirect.
 */
WebBrowser.maybeCompleteAuthSession();

/**
 * Inicia sesión con Google. Devuelve la `Session` obtenida o `null` si el
 * usuario cancela/cierra el flujo antes de completarlo (R1.4): no lanza en
 * ese caso, para que la pantalla de login no muestre un error bloqueante.
 */
export async function signInWithGoogle(): Promise<Session | null> {
  const redirectTo = makeRedirectUri({ scheme: 'medallerosanpedro' });
  if (__DEV__) {
    console.log('[auth debug] redirectTo =', redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });

  if (error) {
    throw error;
  }
  if (!data?.url) {
    throw new Error('Supabase no ha devuelto una URL de autenticación de Google.');
  }
  if (__DEV__) {
    console.log('[auth debug] authorize url =', data.url);
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (__DEV__) {
    console.log('[auth debug] webbrowser result =', JSON.stringify(result));
  }

  if (result.type !== 'success') {
    // Cancelación o cierre del navegador (R1.4): sin error, sin sesión.
    return null;
  }

  const { queryParams } = Linking.parse(result.url);
  const code = queryParams?.code;

  if (typeof code !== 'string') {
    return null;
  }

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    throw exchangeError;
  }

  return sessionData.session;
}

/** Cierra sesión y elimina la sesión persistida localmente (R1.6). */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

/** Sesión actual (restaurada de `AsyncStorage` si existe, R1.5). */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/** Wrapper de `supabase.auth.onAuthStateChange` para no filtrar el SDK a la UI. */
export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}
