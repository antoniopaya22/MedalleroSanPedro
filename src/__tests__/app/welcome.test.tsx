import { fireEvent, render, screen } from '@testing-library/react-native';

const mockReplace = jest.fn();
const mockSignInWithGoogle = jest.fn();
const mockChooseGuest = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    signInWithGoogle: mockSignInWithGoogle,
    chooseGuest: mockChooseGuest,
  }),
}));

import WelcomeScreen from '@/app/welcome';
import { ThemeProvider } from '@/theme';

describe('WelcomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra ambas opciones: Google e invitado', async () => {
    await render(
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>
    );

    expect(screen.getByText('Iniciar sesión con Google')).toBeTruthy();
    expect(screen.getByText('Continuar como invitado')).toBeTruthy();
  });

  it('"Continuar como invitado" llama a chooseGuest() y router.replace(\'/\'), sin signInWithGoogle (R3.1)', async () => {
    await render(
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>
    );

    await fireEvent.press(screen.getByText('Continuar como invitado'));

    expect(mockChooseGuest).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockSignInWithGoogle).not.toHaveBeenCalled();
  });

  it('el botón de Google llama a signInWithGoogle (R4.1)', async () => {
    mockSignInWithGoogle.mockResolvedValue({ user: { id: 'user-1' } });

    await render(
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión con Google' }));

    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('si signInWithGoogle lanza, muestra un mensaje de error en español (R4.4)', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('boom'));

    await render(
      <ThemeProvider>
        <WelcomeScreen />
      </ThemeProvider>
    );

    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión con Google' }));

    expect(await screen.findByText('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.')).toBeTruthy();
  });
});
