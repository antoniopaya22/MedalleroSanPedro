import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
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

jest.mock('@/services/people', () => ({
  listPeople: jest.fn(),
}));

import PeopleListScreen from '@/app/(tabs)/people/index';
import { useAuth } from '@/context/AuthContext';
import { listPeople } from '@/services/people';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListPeople = listPeople as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('PeopleListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListPeople.mockResolvedValue([
      { id: '1', name: 'Ana', active: true, claimedByUserId: null, createdAt: '2024-01-01' },
      { id: '2', name: 'Beto', active: false, claimedByUserId: null, createdAt: '2024-01-02' },
    ]);
  });

  it('oculta "Añadir persona" y las filas no son accionables cuando canWrite es false', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<PeopleListScreen />);

    expect(screen.queryByText('Añadir persona')).toBeNull();
  });

  it('muestra "Añadir persona" cuando canWrite es true', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });

    await renderWithTheme(<PeopleListScreen />);

    expect(await screen.findByText('Añadir persona')).toBeTruthy();
  });

  it('muestra el Badge "Inactiva" para una persona con active=false (R4.2)', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<PeopleListScreen />);

    expect(await screen.findByText('Beto')).toBeTruthy();
    expect(screen.getByText('Inactiva')).toBeTruthy();
  });

  it('no muestra el Badge "Inactiva" para una persona con active=true', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<PeopleListScreen />);

    await screen.findByText('Ana');
    // Solo debe existir un Badge "Inactiva" (el de Beto), nunca junto a Ana.
    expect(screen.getAllByText('Inactiva')).toHaveLength(1);
  });

  describe('buscador y filtro Todos/Activos/Inactivos (f-021, R2)', () => {
    it('el buscador filtra por nombre en cliente', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PeopleListScreen />);

      await screen.findByText('Ana');
      expect(screen.getByText('Beto')).toBeTruthy();

      await fireEvent.changeText(screen.getByPlaceholderText('Buscar participante'), 'an');

      await waitFor(() => expect(screen.queryByText('Beto')).toBeNull());
      expect(screen.getByText('Ana')).toBeTruthy();
    });

    it('el filtro "Activos" oculta a las personas inactivas', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PeopleListScreen />);

      await screen.findByText('Ana');
      await fireEvent.press(screen.getByLabelText('Filtrar participantes'));
      await fireEvent.press(screen.getByText('Activos'));

      await waitFor(() => expect(screen.queryByText('Beto')).toBeNull());
      expect(screen.getByText('Ana')).toBeTruthy();
    });

    it('el filtro "Inactivos" oculta a las personas activas', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PeopleListScreen />);

      await screen.findByText('Ana');
      await fireEvent.press(screen.getByLabelText('Filtrar participantes'));
      await fireEvent.press(screen.getByText('Inactivos'));

      await waitFor(() => expect(screen.queryByText('Ana')).toBeNull());
      expect(screen.getByText('Beto')).toBeTruthy();
    });

    it('buscador y filtro de estado se combinan (R2.3) y muestran "Sin resultados" si no hay coincidencias (R2.4)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PeopleListScreen />);

      await screen.findByText('Ana');
      await fireEvent.press(screen.getByLabelText('Filtrar participantes'));
      await fireEvent.press(screen.getByText('Inactivos'));
      await fireEvent.changeText(screen.getByPlaceholderText('Buscar participante'), 'ana');

      await waitFor(() => expect(screen.getByText('Sin resultados')).toBeTruthy());
    });
  });
});
