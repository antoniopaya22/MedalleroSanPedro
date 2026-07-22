import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  // Mock simplificado: ejecuta el efecto al montar (equivalente a useEffect),
  // suficiente para este test de gating de UI que no depende del ciclo de foco.
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/editions', () => ({
  listEditions: jest.fn(),
}));

import EditionsListScreen from '@/app/(tabs)/editions/index';
import { useAuth } from '@/context/AuthContext';
import { listEditions } from '@/services/editions';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListEditions = listEditions as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('EditionsListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListEditions.mockResolvedValue([
      { id: '1', year: 2024, label: 'Edición 2024', startDate: null, endDate: null, createdAt: '2024-01-01' },
      { id: '2', year: 2023, label: null, startDate: null, endDate: null, createdAt: '2023-01-01' },
    ]);
  });

  describe('gating de permisos (R4.2) y navegación pública al detalle (f-016, R1.1)', () => {
    it('oculta "Añadir edición" pero las filas siguen siendo navegables al detalle cuando canWrite es false', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionsListScreen />);

      expect(await screen.findByText('2024')).toBeTruthy();
      expect(screen.queryByText('Añadir edición')).toBeNull();

      await fireEvent.press(screen.getByRole('button', { name: /2024/ }));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/editions/[id]', params: { id: '1' } });
    });

    it('muestra "Añadir edición" y las filas son navegables cuando canWrite es true', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<EditionsListScreen />);

      expect(await screen.findByText('Añadir edición')).toBeTruthy();
      expect(screen.getByRole('button', { name: /2024/ })).toBeTruthy();
      expect(screen.getByRole('button', { name: /2023/ })).toBeTruthy();

      await fireEvent.press(screen.getByRole('button', { name: /2023/ }));
      expect(mockPush).toHaveBeenCalledWith({ pathname: '/editions/[id]', params: { id: '2' } });
    });
  });
});
