import { fireEvent, render, screen } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockSignOut = jest.fn();
const mockSetPreference = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/theme', () => {
  const actual = jest.requireActual('@/theme');
  return {
    ...actual,
    useTheme: jest.fn(),
  };
});

import SettingsScreen from '@/app/(tabs)/settings/index';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type SchemePreference, type Theme } from '@/theme';

const actualTheme = jest.requireActual('@/theme');

const mockUseAuth = useAuth as jest.Mock;
const mockUseTheme = useTheme as unknown as jest.Mock;

/** Tema real (colores, spacing...) con `preference`/`setPreference` controlados por el test. */
function buildTheme(preference: SchemePreference): Theme {
  return {
    scheme: 'light',
    preference,
    colors: actualTheme.Colors.light,
    spacing: actualTheme.Spacing,
    radius: actualTheme.Radius,
    touchTarget: actualTheme.TouchTarget,
    typography: actualTheme.Typography,
    shadows: actualTheme.getShadows('light'),
    setPreference: mockSetPreference,
  };
}

describe('SettingsScreen (R3, R4)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(buildTheme('light'));
  });

  describe('Sección Cuenta (R3)', () => {
    it('con isAuthenticated=true muestra el email y "Cerrar sesión" invoca signOut', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { email: 'persona@example.com' },
        signOut: mockSignOut,
      });

      await render(<SettingsScreen />);

      expect(screen.getByText('persona@example.com')).toBeTruthy();

      await fireEvent.press(screen.getByText('Cerrar sesión'));

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('con isAuthenticated=false muestra el SignInPrompt y no "Cerrar sesión"', async () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: mockSignOut,
      });

      await render(<SettingsScreen />);

      expect(screen.getByText('Accede con tu cuenta')).toBeTruthy();
      expect(screen.getByText('Iniciar sesión con Google')).toBeTruthy();
      expect(screen.queryByText('Cerrar sesión')).toBeNull();
    });
  });

  describe('Selector de tema (R4)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
        signOut: mockSignOut,
      });
    });

    it('pulsar "Oscuro" invoca setPreference("dark")', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByText('Oscuro'));

      expect(mockSetPreference).toHaveBeenCalledWith('dark');
    });

    it('pulsar "Claro" invoca setPreference("light")', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByText('Claro'));

      expect(mockSetPreference).toHaveBeenCalledWith('light');
    });

    it('pulsar "Sistema" invoca setPreference("system")', async () => {
      await render(<SettingsScreen />);

      await fireEvent.press(screen.getByText('Sistema'));

      expect(mockSetPreference).toHaveBeenCalledWith('system');
    });

    it('la opción marcada refleja la preferencia actual', async () => {
      mockUseTheme.mockReturnValue(buildTheme('dark'));

      await render(<SettingsScreen />);

      const dark = screen.getByLabelText('Oscuro');
      expect(dark.props.accessibilityState?.selected).toBe(true);

      const light = screen.getByLabelText('Claro');
      expect(light.props.accessibilityState?.selected).toBe(false);
    });
  });
});
