import type { Session, User } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import * as authService from '@/services/auth';
import { fetchMyProfile } from '@/services/profiles';
import type { Profile } from '@/types/domain';

export interface Auth {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** `true` si hay sesión de Supabase Auth (usuario logueado con Google). */
  isAuthenticated: boolean;
  /** `true` si el `Profile` del usuario ya tiene una `Person` reclamada. */
  hasClaimedPerson: boolean;
  /**
   * Señal para la capa de UI (R4.3): autenticado y con `Person` reclamada.
   * No sustituye a las políticas RLS (que son la garantía real), solo evita
   * que features futuras muestren controles de escritura que fallarían.
   */
  canWrite: boolean;
  /** `true` si el usuario eligió "invitado" en esta sesión de la app (solo memoria). */
  guestChosen: boolean;
  /** Marca la elección de "continuar como invitado" para la sesión actual. */
  chooseGuest: () => void;
  signInWithGoogle: () => Promise<Session | null>;
  signOut: () => Promise<void>;
  /** Vuelve a cargar el `Profile` (llamar tras reclamar una `Person`). */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // Solo en memoria (R5.3): debe resetearse al reabrir la app, así que no se
  // persiste en AsyncStorage. Ver design.md §2.
  const [guestChosen, setGuestChosen] = useState(false);

  const loadProfile = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setProfile(null);
      return;
    }
    const nextProfile = await fetchMyProfile();
    setProfile(nextProfile);
  }, []);

  useEffect(() => {
    let active = true;

    authService.getSession().then(async (initialSession) => {
      if (!active) {
        return;
      }
      setSession(initialSession);
      await loadProfile(initialSession);
      if (active) {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = authService.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      loadProfile(nextSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session);
  }, [loadProfile, session]);

  const chooseGuest = useCallback(() => {
    setGuestChosen(true);
  }, []);

  const signOut = useCallback(async () => {
    await authService.signOut();
    // R5.4: cerrar sesión descarta cualquier elección de invitado previa.
    setGuestChosen(false);
  }, []);

  const value = useMemo<Auth>(() => {
    const isAuthenticated = !!session;
    const hasClaimedPerson = !!profile?.personId;

    return {
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAuthenticated,
      hasClaimedPerson,
      canWrite: isAuthenticated && hasClaimedPerson,
      guestChosen,
      chooseGuest,
      signInWithGoogle: authService.signInWithGoogle,
      signOut,
      refreshProfile,
    };
  }, [session, profile, loading, guestChosen, chooseGuest, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}
