jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signOut: jest.fn(),
      getSession: jest.fn(),
      onAuthStateChange: jest.fn(),
    },
  },
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'medallerosanpedro://redirect'),
}));

jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { getSession, onAuthStateChange, signInWithGoogle, signOut } from '@/services/auth';
import { supabase } from '@/services/supabase';

const mockSignInWithOAuth = supabase.auth.signInWithOAuth as jest.Mock;
const mockExchangeCodeForSession = supabase.auth.exchangeCodeForSession as jest.Mock;
const mockSignOut = supabase.auth.signOut as jest.Mock;
const mockGetSession = supabase.auth.getSession as jest.Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockMakeRedirectUri = makeRedirectUri as jest.Mock;
const mockOpenAuthSessionAsync = WebBrowser.openAuthSessionAsync as jest.Mock;
const mockParse = Linking.parse as jest.Mock;

describe('src/services/auth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithGoogle', () => {
    it('construye el redirectTo, abre el navegador e intercambia el code en éxito', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://google.example/auth' }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: 'success', url: 'medallerosanpedro://redirect?code=abc123' });
      mockParse.mockReturnValue({ queryParams: { code: 'abc123' } });
      mockExchangeCodeForSession.mockResolvedValue({ data: { session: { access_token: 'token' } }, error: null });

      const result = await signInWithGoogle();

      expect(mockMakeRedirectUri).toHaveBeenCalledWith({ scheme: 'medallerosanpedro' });
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: 'medallerosanpedro://redirect', skipBrowserRedirect: true },
      });
      expect(mockOpenAuthSessionAsync).toHaveBeenCalledWith(
        'https://google.example/auth',
        'medallerosanpedro://redirect'
      );
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
      expect(result).toEqual({ access_token: 'token' });
    });

    it('devuelve null sin lanzar cuando el usuario cancela el flujo', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://google.example/auth' }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: 'cancel' });

      const result = await signInWithGoogle();

      expect(result).toBeNull();
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('devuelve null sin lanzar cuando el usuario descarta el flujo (dismiss)', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://google.example/auth' }, error: null });
      mockOpenAuthSessionAsync.mockResolvedValue({ type: 'dismiss' });

      const result = await signInWithGoogle();

      expect(result).toBeNull();
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it('lanza si signInWithOAuth devuelve error', async () => {
      mockSignInWithOAuth.mockResolvedValue({ data: null, error: new Error('boom') });

      await expect(signInWithGoogle()).rejects.toThrow('boom');
      expect(mockOpenAuthSessionAsync).not.toHaveBeenCalled();
    });
  });

  describe('signOut', () => {
    it('delega en supabase.auth.signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await signOut();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('lanza si supabase.auth.signOut devuelve error', async () => {
      mockSignOut.mockResolvedValue({ error: new Error('fallo de red') });

      await expect(signOut()).rejects.toThrow('fallo de red');
    });
  });

  describe('getSession', () => {
    it('devuelve la sesión actual delegando en supabase.auth.getSession', async () => {
      mockGetSession.mockResolvedValue({ data: { session: { access_token: 'restored' } } });

      const session = await getSession();

      expect(session).toEqual({ access_token: 'restored' });
    });
  });

  describe('onAuthStateChange', () => {
    it('delega en supabase.auth.onAuthStateChange', () => {
      const callback = jest.fn();
      mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });

      onAuthStateChange(callback);

      expect(mockOnAuthStateChange).toHaveBeenCalledWith(callback);
    });
  });
});
