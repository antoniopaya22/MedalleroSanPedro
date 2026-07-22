import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
}));

jest.mock('@/services/activities', () => ({
  listActivities: jest.fn(),
  searchActivities: jest.fn(),
}));

jest.mock('@/services/activityResults', () => ({
  listActivityHistory: jest.fn(),
}));

jest.mock('@/services/rankings', () => ({
  listActivityRanking: jest.fn(),
  // Reimplementación mínima y aislada de `sortRanking` (evita cargar el
  // módulo real, que importa `@/services/supabase`).
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

import ActivityRankingDetailScreen from '@/app/(tabs)/rankings/activities/[id]';
import ActivityRankingIndexScreen from '@/app/(tabs)/rankings/activities/index';
import { listActivities, searchActivities } from '@/services/activities';
import { listActivityHistory } from '@/services/activityResults';
import { listActivityRanking } from '@/services/rankings';
import { ThemeProvider } from '@/theme';

const mockListActivities = listActivities as jest.Mock;
const mockSearchActivities = searchActivities as jest.Mock;
const mockListActivityHistory = listActivityHistory as jest.Mock;
const mockListActivityRanking = listActivityRanking as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('rankings/activities screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'a1' });

    mockSearchActivities.mockResolvedValue([
      { id: 'a1', name: 'Catan', createdAt: '2026-01-01' },
      { id: 'a2', name: 'Ping pong', createdAt: '2026-01-01' },
    ]);
    mockListActivities.mockResolvedValue([
      { id: 'a1', name: 'Catan', createdAt: '2026-01-01' },
      { id: 'a2', name: 'Ping pong', createdAt: '2026-01-01' },
    ]);
    mockListActivityHistory.mockResolvedValue([
      {
        resultId: 'r1',
        editionId: 'e1',
        editionYear: 2026,
        editionLabel: 'Verano',
        playedAt: '2026-07-01',
        participantCount: 4,
        medals: [
          { medal: 'gold', personNames: ['Ana'] },
          { medal: 'silver', personNames: ['Bea'] },
        ],
      },
    ]);
    mockListActivityRanking.mockResolvedValue([
      {
        personId: 'p1',
        personName: 'Ana',
        gold: 3,
        silver: 0,
        bronze: 0,
        total: 3,
        score: 9,
        participations: 10,
        scorePerParticipation: 0.9,
      },
      {
        personId: 'p2',
        personName: 'Bea',
        gold: 1,
        silver: 0,
        bronze: 0,
        total: 1,
        score: 3,
        participations: 1,
        scorePerParticipation: 3,
      },
    ]);
  });

  describe('index (selector)', () => {
    it('lista las actividades y filtra por nombre en cliente', async () => {
      await renderWithTheme(<ActivityRankingIndexScreen />);

      expect(await screen.findByText('Catan')).toBeTruthy();
      expect(screen.getByText('Ping pong')).toBeTruthy();

      const input = screen.getByDisplayValue('');
      await fireEvent.changeText(input, 'catan');

      await waitFor(() => expect(screen.queryByText('Ping pong')).toBeNull());
      expect(screen.getByText('Catan')).toBeTruthy();
    });

    it('navega al detalle de la actividad seleccionada', async () => {
      await renderWithTheme(<ActivityRankingIndexScreen />);

      await fireEvent.press(await screen.findByText('Catan'));

      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/rankings/activities/[id]',
        params: { id: 'a1' },
      });
    });

    it('muestra un estado vacío cuando no hay actividades', async () => {
      mockSearchActivities.mockResolvedValue([]);

      await renderWithTheme(<ActivityRankingIndexScreen />);

      expect(await screen.findByText('Todavía no hay actividades')).toBeTruthy();
    });

    it('no muestra ningún control de escritura', async () => {
      await renderWithTheme(<ActivityRankingIndexScreen />);

      await screen.findByText('Catan');
      expect(screen.queryByText('Añadir actividad')).toBeNull();
    });
  });

  describe('detalle', () => {
    it('muestra el histórico de pruebas con edición, participantes y ganadores', async () => {
      await renderWithTheme(<ActivityRankingDetailScreen />);

      // "2026 · Verano" aparece dos veces a propósito: la chip de esa edición
      // (f-021, R4.1) y el título de la prueba en el histórico.
      expect(await screen.findAllByText('2026 · Verano')).toHaveLength(2);
      expect(screen.getByText('4 participantes')).toBeTruthy();
      expect(mockListActivityHistory).toHaveBeenCalledWith('a1');
      expect(mockListActivityRanking).toHaveBeenCalledWith('a1');
    });

    it('muestra la clasificación con desglose, total, participaciones y promedio', async () => {
      await renderWithTheme(<ActivityRankingDetailScreen />);

      expect(await screen.findByText('1. Ana')).toBeTruthy();
      expect(screen.getByText('Oro 3 · Plata 0 · Bronce 0')).toBeTruthy();
      await waitFor(() => expect(screen.getByText('3 medallas · 10 part. · 0.90')).toBeTruthy());
    });

    it('el toggle "Por promedio" reordena la clasificación en cliente sin volver a consultar el servicio', async () => {
      await renderWithTheme(<ActivityRankingDetailScreen />);

      await screen.findByText('1. Ana');
      expect(mockListActivityRanking).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByText('Por promedio'));

      await waitFor(() => expect(screen.getByText('1. Bea')).toBeTruthy());
      expect(screen.getByText('2. Ana')).toBeTruthy();
      expect(mockListActivityRanking).toHaveBeenCalledTimes(1);
    });

    it('las chips de edición filtran el histórico de pruebas sin refetch y sin afectar a la clasificación (f-021, R4)', async () => {
      // Ids deliberadamente "adversariales" (no ordenables como string en el
      // mismo orden que sus años: 'aaa'... < 'zzz'... alfabéticamente, pero
      // 2026 > 2025): en producción `edition_id` es un uuid, no ordenable
      // cronológicamente por string. Si el orden de las chips se calculara
      // por `editionId` en vez de por `editionYear`, este test lo detectaría.
      mockListActivityHistory.mockResolvedValue([
        {
          resultId: 'r1',
          editionId: 'aaa-edition-2026',
          editionYear: 2026,
          editionLabel: 'Verano',
          playedAt: '2026-07-01',
          participantCount: 4,
          medals: [{ medal: 'gold', personNames: ['Ana'] }],
        },
        {
          resultId: 'r2',
          editionId: 'zzz-edition-2025',
          editionYear: 2025,
          editionLabel: null,
          playedAt: '2025-07-01',
          participantCount: 3,
          medals: [{ medal: 'gold', personNames: ['Bea'] }],
        },
      ]);

      await renderWithTheme(<ActivityRankingDetailScreen />);

      // Ambas pruebas visibles con la chip "Todas" (activa por defecto). Se
      // comprueba por `participantCount` (único por prueba) porque el texto
      // de la chip de cada edición coincide a propósito con el título de su
      // prueba en el histórico (mismo formato "año · etiqueta").
      await screen.findByText('4 participantes');
      expect(screen.getByText('3 participantes')).toBeTruthy();
      expect(mockListActivityHistory).toHaveBeenCalledTimes(1);

      // Orden de las chips: más reciente (2026) primero, pese a que su id
      // ('aaa...') ordena antes que el de 2025 ('zzz...') alfabéticamente.
      const chipTestIds = screen.getAllByTestId(/^edition-chip-/).map((node) => node.props.testID);
      expect(chipTestIds).toEqual(['edition-chip-all', 'edition-chip-aaa-edition-2026', 'edition-chip-zzz-edition-2025']);

      await fireEvent.press(screen.getByTestId('edition-chip-zzz-edition-2025'));

      await waitFor(() => expect(screen.queryByText('4 participantes')).toBeNull());
      expect(screen.getByText('3 participantes')).toBeTruthy();
      expect(mockListActivityHistory).toHaveBeenCalledTimes(1);
      // La clasificación sigue igual (R4.3): no se ha vuelto a pedir ni ha cambiado.
      expect(mockListActivityRanking).toHaveBeenCalledTimes(1);
      expect(screen.getByText('1. Ana')).toBeTruthy();

      await fireEvent.press(screen.getByTestId('edition-chip-all'));
      await waitFor(() => expect(screen.getByText('4 participantes')).toBeTruthy());
      expect(screen.getByText('3 participantes')).toBeTruthy();
    });

    it('muestra estados vacíos cuando no hay clasificación ni histórico', async () => {
      mockListActivityRanking.mockResolvedValue([]);
      mockListActivityHistory.mockResolvedValue([]);

      await renderWithTheme(<ActivityRankingDetailScreen />);

      expect(await screen.findByText('Sin resultados')).toBeTruthy();
      expect(screen.getByText('Sin pruebas registradas')).toBeTruthy();
    });

    it('no muestra ningún control de escritura', async () => {
      await renderWithTheme(<ActivityRankingDetailScreen />);

      await screen.findByText('1. Ana');
      expect(screen.queryByText('Registrar resultado')).toBeNull();
      expect(screen.queryByText('Guardar')).toBeNull();
    });
  });
});
