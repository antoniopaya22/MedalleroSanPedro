import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

import { AppTabBar } from '@/components/navigation/AppTabBar';
import { useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;

function renderWithProviders(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

// Props mínimas de `BottomTabBarProps`: 4 rutas en el mismo orden que
// `(tabs)/_layout.tsx` (editions, rankings, people, settings).
function buildProps(overrides?: { emit?: jest.Mock; navigate?: jest.Mock }) {
  const emit = overrides?.emit ?? jest.fn(() => ({ defaultPrevented: false }));
  const navigate = overrides?.navigate ?? jest.fn();

  const state = {
    index: 0,
    routes: [
      { key: 'editions-key', name: 'editions' },
      { key: 'rankings-key', name: 'rankings' },
      { key: 'people-key', name: 'people' },
      { key: 'settings-key', name: 'settings' },
    ],
  };

  return {
    state,
    descriptors: {},
    navigation: { emit, navigate },
    insets: { top: 0, left: 0, right: 0, bottom: 0 },
  } as any;
}

describe('AppTabBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra las 4 pestañas (solo icono, sin texto), repartidas 2/2 a cada lado del FAB', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });

    await renderWithProviders(<AppTabBar {...buildProps()} />);

    expect(screen.getByLabelText('Ediciones')).toBeTruthy();
    expect(screen.getByLabelText('Clasificaciones')).toBeTruthy();
    expect(screen.getByLabelText('Participantes')).toBeTruthy();
    expect(screen.getByLabelText('Ajustes')).toBeTruthy();
    expect(screen.queryByText('Ediciones')).toBeNull();
  });

  describe('FAB de registro rápido (R4)', () => {
    it('con canWrite=true, pulsar el FAB navega a /results/new', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithProviders(<AppTabBar {...buildProps()} />);

      await fireEvent.press(screen.getByLabelText('Registrar resultado'));

      expect(mockPush).toHaveBeenCalledWith('/results/new');
      expect(mockPush).not.toHaveBeenCalledWith('/sign-in');
    });

    it('con canWrite=false, pulsar el FAB navega a /sign-in y NO a /results/new', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithProviders(<AppTabBar {...buildProps()} />);

      await fireEvent.press(screen.getByLabelText('Registrar resultado'));

      expect(mockPush).toHaveBeenCalledWith('/sign-in');
      expect(mockPush).not.toHaveBeenCalledWith('/results/new');
    });
  });
});
