import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';

jest.mock('@/services/auth', () => ({
  getSession: jest.fn(),
  onAuthStateChange: jest.fn(),
  signInWithGoogle: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock('@/services/profiles', () => ({
  fetchMyProfile: jest.fn(),
}));

import * as authService from '@/services/auth';
import { fetchMyProfile } from '@/services/profiles';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const mockGetSession = authService.getSession as jest.Mock;
const mockOnAuthStateChange = authService.onAuthStateChange as jest.Mock;
const mockFetchMyProfile = fetchMyProfile as jest.Mock;
const mockAuthServiceSignOut = authService.signOut as jest.Mock;

const SESSION = { user: { id: 'user-1', email: 'user@example.com' } } as any;

function Probe() {
  const { loading, isAuthenticated, hasClaimedPerson, canWrite } = useAuth();

  if (loading) {
    return <Text>cargando</Text>;
  }

  return (
    <Text>
      {JSON.stringify({ isAuthenticated, hasClaimedPerson, canWrite })}
    </Text>
  );
}

function GuestProbe() {
  const { loading, guestChosen, chooseGuest, signOut } = useAuth();

  if (loading) {
    return <Text>cargando</Text>;
  }

  return (
    <>
      <Text>{JSON.stringify({ guestChosen })}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="elegir-invitado" onPress={chooseGuest}>
        <Text>elegir invitado</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="cerrar-sesion" onPress={signOut}>
        <Text>cerrar sesión</Text>
      </Pressable>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } });
  });

  it('hasClaimedPerson/canWrite son false cuando el Profile no tiene personId', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchMyProfile.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      personId: null,
      createdAt: '2024-01-01',
    });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/isAuthenticated/)).toBeTruthy();
    });

    expect(
      screen.getByText(JSON.stringify({ isAuthenticated: true, hasClaimedPerson: false, canWrite: false }))
    ).toBeTruthy();
  });

  it('hasClaimedPerson/canWrite son true cuando el Profile tiene personId', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockFetchMyProfile.mockResolvedValue({
      userId: 'user-1',
      email: 'user@example.com',
      personId: 'person-1',
      createdAt: '2024-01-01',
    });

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(
        screen.getByText(JSON.stringify({ isAuthenticated: true, hasClaimedPerson: true, canWrite: true }))
      ).toBeTruthy();
    });
  });

  it('useAuth lanza si se usa fuera de AuthProvider', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(render(<Probe />)).rejects.toThrow('useAuth debe usarse dentro de <AuthProvider>');

    consoleError.mockRestore();
  });

  it('guestChosen arranca en false; chooseGuest() lo pone a true (R5.2)', async () => {
    mockGetSession.mockResolvedValue(null);

    await render(
      <AuthProvider>
        <GuestProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ guestChosen: false }))).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('elegir-invitado'));

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ guestChosen: true }))).toBeTruthy();
    });
  });

  it('signOut() descarta la elección de invitado previa (R5.4)', async () => {
    mockGetSession.mockResolvedValue(null);
    mockAuthServiceSignOut.mockResolvedValue(undefined);

    await render(
      <AuthProvider>
        <GuestProbe />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ guestChosen: false }))).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('elegir-invitado'));

    await waitFor(() => {
      expect(screen.getByText(JSON.stringify({ guestChosen: true }))).toBeTruthy();
    });

    await fireEvent.press(screen.getByLabelText('cerrar-sesion'));

    await waitFor(() => {
      expect(mockAuthServiceSignOut).toHaveBeenCalledTimes(1);
      expect(screen.getByText(JSON.stringify({ guestChosen: false }))).toBeTruthy();
    });
  });
});
