import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual('react');
    React.useEffect(effect, [effect]);
  },
}));

jest.mock('@/services/editions', () => ({
  listEditions: jest.fn(),
}));

jest.mock('@/services/rankings', () => ({
  listHistoricRanking: jest.fn(),
  // Reimplementación mínima y aislada de `sortHistoricRanking` (evita cargar
  // el módulo real, que importa `@/services/supabase` y requiere variables
  // de entorno no disponibles en este test de pantalla).
  sortHistoricRanking: (rows: any[], mode: 'medals' | 'average') => {
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

import HistoricRankingScreen from '@/app/(tabs)/rankings/historic';
import { listEditions } from '@/services/editions';
import { listHistoricRanking } from '@/services/rankings';
import { ThemeProvider } from '@/theme';

const mockListHistoricRanking = listHistoricRanking as jest.Mock;
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

describe('rankings/historic screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListEditions.mockResolvedValue([
      { id: 'e2016', year: 2016, label: null, startDate: null, endDate: null, createdAt: '2016-01-01' },
      { id: 'e2021', year: 2021, label: null, startDate: null, endDate: null, createdAt: '2021-01-01' },
      { id: 'e2026', year: 2026, label: null, startDate: null, endDate: null, createdAt: '2026-01-01' },
    ]);
    mockListHistoricRanking.mockResolvedValue([
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

  it('muestra sin sesión el desglose de medallas, total, participaciones y promedio', async () => {
    await renderWithTheme(<HistoricRankingScreen />);

    expect(await screen.findByText('1. Ana')).toBeTruthy();
    expect(screen.getByLabelText('Oro 3 · Plata 0 · Bronce 0')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('9 pts · 10 part. · 0.90')).toBeTruthy());
    expect(screen.getByText('2. Bea')).toBeTruthy();
    expect(mockListHistoricRanking).toHaveBeenCalledTimes(1);
  });

  it('no muestra ningun control de escritura', async () => {
    await renderWithTheme(<HistoricRankingScreen />);

    await screen.findByText('1. Ana');
    expect(screen.queryByText('Registrar resultado')).toBeNull();
    expect(screen.queryByText('Guardar')).toBeNull();
  });

  it('el toggle "Por promedio" reordena la lista en cliente sin volver a consultar el servicio', async () => {
    await renderWithTheme(<HistoricRankingScreen />);

    await screen.findByText('1. Ana');
    expect(mockListHistoricRanking).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Por promedio'));

    await waitFor(() => expect(screen.getByText('1. Bea')).toBeTruthy());
    expect(screen.getByText('2. Ana')).toBeTruthy();
    expect(mockListHistoricRanking).toHaveBeenCalledTimes(1);
  });

  it('las chips de rango recargan con el yearRange calculado sobre el año de edición más reciente (f-021)', async () => {
    await renderWithTheme(<HistoricRankingScreen />);

    await screen.findByText('1. Ana');
    expect(mockListHistoricRanking).toHaveBeenCalledTimes(1);
    expect(mockListHistoricRanking).toHaveBeenLastCalledWith(undefined);

    await fireEvent.press(screen.getByLabelText('Rango de años'));
    await fireEvent.press(screen.getByText('Últimos 5 años'));

    // Año más reciente en los datos mockeados: 2026. Últimos 5 años -> [2022, 2026].
    await waitFor(() => expect(mockListHistoricRanking).toHaveBeenCalledTimes(2));
    expect(mockListHistoricRanking).toHaveBeenLastCalledWith({ fromYear: 2022 });

    await fireEvent.press(screen.getByLabelText(/Rango de años/));
    await fireEvent.press(screen.getByText('Últimos 10 años'));
    await waitFor(() => expect(mockListHistoricRanking).toHaveBeenCalledTimes(3));
    expect(mockListHistoricRanking).toHaveBeenLastCalledWith({ fromYear: 2017 });

    await fireEvent.press(screen.getByLabelText(/Rango de años/));
    await fireEvent.press(screen.getByText('Todas'));
    await waitFor(() => expect(mockListHistoricRanking).toHaveBeenCalledTimes(4));
    expect(mockListHistoricRanking).toHaveBeenLastCalledWith(undefined);
  });

  it('muestra un estado vacio cuando no hay pruebas registradas', async () => {
    mockListHistoricRanking.mockResolvedValue([]);

    await renderWithTheme(<HistoricRankingScreen />);

    expect(await screen.findByText('Sin resultados')).toBeTruthy();
  });
});
