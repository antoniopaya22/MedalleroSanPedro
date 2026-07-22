import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  // Referencia estable (igual que la real `useRouter()`): un objeto literal
  // nuevo en cada llamada rompería los `useEffect` que dependen de `router`
  // (p. ej. el guard de `edit.tsx`), provocando un bucle infinito en tests.
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/editions', () => ({
  listEditions: jest.fn(),
  updateEdition: jest.fn(),
  EditionYearTakenError: class EditionYearTakenError extends Error {},
}));

jest.mock('@/services/rankings', () => ({
  listEditionRanking: jest.fn(),
  // Reimplementación mínima y aislada de `sortRanking` (evita cargar el
  // módulo real, que importa `@/services/supabase`), mismo patrón que
  // `rankings-activities.test.tsx`.
  sortRanking: (rows: any[], mode: 'medals' | 'average') => {
    const compareByMedals = (a: any, b: any) =>
      b.score - a.score ||
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      b.total - a.total ||
      a.personName.localeCompare(b.personName);
    const compareByAverage = (a: any, b: any) =>
      b.scorePerParticipation - a.scorePerParticipation ||
      b.score - a.score ||
      b.gold - a.gold ||
      b.silver - a.silver ||
      b.bronze - a.bronze ||
      a.personName.localeCompare(b.personName);
    return [...rows].sort(mode === 'average' ? compareByAverage : compareByMedals);
  },
}));

jest.mock('@/services/activityResults', () => ({
  listEditionHistory: jest.fn(),
}));

import EditionDetailScreen from '@/app/(tabs)/editions/[id]/index';
import EditEditionScreen from '@/app/(tabs)/editions/[id]/edit';
import { useAuth } from '@/context/AuthContext';
import { listEditionHistory } from '@/services/activityResults';
import { listEditions } from '@/services/editions';
import { listEditionRanking } from '@/services/rankings';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListEditions = listEditions as jest.Mock;
const mockListEditionRanking = listEditionRanking as jest.Mock;
const mockListEditionHistory = listEditionHistory as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

const EDITIONS = [{ id: 'e1', year: 2026, label: 'Verano', startDate: null, endDate: null, createdAt: '2026-01-01' }];

const RANKING = [
  {
    personId: 'p1',
    personName: 'Ana',
    gold: 1,
    silver: 0,
    bronze: 1,
    total: 2,
    score: 4,
    participations: 3,
    scorePerParticipation: 4 / 3,
  },
  {
    personId: 'p2',
    personName: 'Bea',
    gold: 0,
    silver: 2,
    bronze: 0,
    total: 2,
    score: 3,
    participations: 1,
    scorePerParticipation: 3,
  },
];

const HISTORY = [
  {
    resultId: 'r1',
    activityId: 'a1',
    activityName: 'Natación',
    playedAt: '2026-07-01',
    participantCount: 2,
    medals: [
      { medal: 'gold', personNames: ['Ana'] },
      { medal: 'silver', personNames: ['Bea'] },
    ],
  },
];

describe('editions/[id]/index (vista de detalle, f-016/f-020)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'e1' });
    mockListEditions.mockResolvedValue(EDITIONS);
    mockListEditionRanking.mockResolvedValue(RANKING);
    mockListEditionHistory.mockResolvedValue(HISTORY);
  });

  describe('acceso público (R2.1)', () => {
    it('muestra cabecera, participantes y clasificación sin sesión (anónimo)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('2026')).toBeTruthy();
      expect(screen.getByText('Verano')).toBeTruthy();
      expect(screen.getByText('1. Ana')).toBeTruthy();
      expect(screen.getByLabelText('Oro 1 · Plata 0 · Bronce 1')).toBeTruthy();
      expect(mockListEditionRanking).toHaveBeenCalledWith('e1');
    });

    it('muestra un estado vacío cuando la edición no tiene resultados (R5.1)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListEditionRanking.mockResolvedValue([]);

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('2026')).toBeTruthy();
      expect(screen.getByText('Todavía sin resultados')).toBeTruthy();
    });

    it('muestra "no encontrada" cuando el id de edición no existe (R5.2)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListEditions.mockResolvedValue([]);

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('No se ha encontrado esa edición.')).toBeTruthy();
    });

    it('muestra un error recuperable si falla la carga (R5.3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListEditionRanking.mockRejectedValue(new Error('fail'));

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('No se ha podido cargar la edición. Inténtalo de nuevo.')).toBeTruthy();
    });
  });

  describe('FAB y acceso a edición solo con canWrite (R3.1/R3.4/R4.3)', () => {
    it('no muestra el FAB ni "Editar edición" cuando canWrite es false', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('2026')).toBeTruthy();
      expect(screen.queryByLabelText('Registrar resultado')).toBeNull();
      expect(screen.queryByText('Editar edición')).toBeNull();
    });

    it('muestra el FAB y navega a /results/new con la edición preseleccionada', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('2026')).toBeTruthy();
      const fab = screen.getByLabelText('Registrar resultado');
      await fireEvent.press(fab);

      expect(mockPush).toHaveBeenCalledWith({ pathname: '/results/new', params: { editionId: 'e1' } });
    });

    it('muestra "Editar edición" y navega a /editions/[id]/edit', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<EditionDetailScreen />);

      await fireEvent.press(await screen.findByText('Editar edición'));

      expect(mockPush).toHaveBeenCalledWith({ pathname: '/editions/[id]/edit', params: { id: 'e1' } });
    });
  });

  describe('pestañas Clasificación/Actividades (f-020, R1/R2/R3)', () => {
    it('arranca en la pestaña Clasificación mostrando el toggle y ocultando Actividades (R1.3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('1. Ana')).toBeTruthy();
      expect(screen.getByText('Por puntos')).toBeTruthy();
      expect(screen.getByText('Por promedio')).toBeTruthy();
      expect(screen.queryByText('Natación')).toBeNull();
      expect(mockListEditionRanking).toHaveBeenCalledTimes(1);
      expect(mockListEditionHistory).toHaveBeenCalledWith('e1');
    });

    it('cambia a la pestaña Actividades sin volver a consultar el backend (R1.2/R1.4)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionDetailScreen />);
      await screen.findByText('1. Ana');

      await fireEvent.press(screen.getByText('Actividades'));

      expect(await screen.findByText('Natación')).toBeTruthy();
      expect(screen.getByText('2 participantes')).toBeTruthy();
      expect(screen.queryByText('1. Ana')).toBeNull();
      expect(mockListEditionRanking).toHaveBeenCalledTimes(1);
      expect(mockListEditionHistory).toHaveBeenCalledTimes(1);
    });

    it('el toggle "Por promedio" reordena la clasificación en cliente sin recargar (R2.3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<EditionDetailScreen />);
      await screen.findByText('1. Ana');

      await fireEvent.press(screen.getByText('Por promedio'));

      expect(await screen.findByText('1. Bea')).toBeTruthy();
      expect(screen.getByText('2. Ana')).toBeTruthy();
      expect(mockListEditionRanking).toHaveBeenCalledTimes(1);
    });

    it('estados vacíos independientes por pestaña (R2.4/R3.5)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListEditionRanking.mockResolvedValue([]);
      mockListEditionHistory.mockResolvedValue([]);

      await renderWithTheme(<EditionDetailScreen />);

      expect(await screen.findByText('Todavía sin resultados')).toBeTruthy();
      expect(screen.queryByText('Por puntos')).toBeNull();

      await fireEvent.press(screen.getByText('Actividades'));

      expect(await screen.findByText('Sin pruebas registradas')).toBeTruthy();
    });

    it('"Editar edición" y el FAB siguen visibles al cambiar a la pestaña Actividades (R4.2/R4.3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<EditionDetailScreen />);
      await screen.findByText('1. Ana');

      await fireEvent.press(screen.getByText('Actividades'));
      await screen.findByText('Natación');

      expect(screen.getByText('Editar edición')).toBeTruthy();
      expect(screen.getByLabelText('Registrar resultado')).toBeTruthy();
    });
  });
});

describe('editions/[id]/edit (formulario reubicado, f-016)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'e1' });
    mockListEditions.mockResolvedValue(EDITIONS);
  });

  it('sin canWrite redirige fuera del formulario y no lo muestra (R4.2)', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<EditEditionScreen />);

    expect(screen.queryByText('Guardar')).toBeNull();
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({ pathname: '/editions/[id]', params: { id: 'e1' } })
    );
  });

  it('con canWrite muestra el formulario con los datos de la edición', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });

    await renderWithTheme(<EditEditionScreen />);

    expect(await screen.findByText('Guardar')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
