import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  // Mock simplificado: ejecuta el efecto al montar (equivalente a useEffect),
  // suficiente para este test de gating de UI y filtrado que no depende del
  // ciclo de foco real.
  useFocusEffect: (effect: () => void) => require('react').useEffect(effect, [effect]),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/activities', () => ({
  listActivities: jest.fn(),
  searchActivities: jest.fn(),
}));

import ActivitiesListScreen from '@/app/activities/index';
import { useAuth } from '@/context/AuthContext';
import { listActivities } from '@/services/activities';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListActivities = listActivities as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

describe('ActivitiesListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListActivities.mockResolvedValue([
      { id: '1', name: 'Ajedrez', createdAt: '2024-01-01' },
      { id: '2', name: 'Fútbol', createdAt: '2024-01-02' },
    ]);
  });

  it('oculta "Añadir actividad" y las filas no son accionables cuando canWrite es false', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<ActivitiesListScreen />);

    await screen.findByText('Ajedrez');
    expect(screen.queryByText('Añadir actividad')).toBeNull();
  });

  it('el buscador y la lista son visibles con canWrite=false', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<ActivitiesListScreen />);

    expect(screen.getByText('Buscar actividad')).toBeTruthy();
    expect(await screen.findByText('Ajedrez')).toBeTruthy();
    expect(await screen.findByText('Fútbol')).toBeTruthy();
  });

  it('muestra "Añadir actividad" cuando canWrite es true', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });

    await renderWithTheme(<ActivitiesListScreen />);

    expect(await screen.findByText('Añadir actividad')).toBeTruthy();
  });

  it('filtra el catálogo al escribir en el buscador (case-insensitive)', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<ActivitiesListScreen />);

    await screen.findByText('Ajedrez');
    await screen.findByText('Fútbol');

    const input = screen.getByDisplayValue('');
    await fireEvent.changeText(input, 'TBOL');

    expect(screen.queryByText('Ajedrez')).toBeNull();
    expect(await screen.findByText('Fútbol')).toBeTruthy();
  });
});
