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

jest.mock('@/services/editions', () => ({
  listEditions: jest.fn(),
}));

// `rankings.ts` importa `./supabase`, que lanza si faltan las variables de
// entorno (no inyectadas por Jest). Se mockea como stub vacío para poder
// hacer `requireActual` de `rankings.ts` (necesitamos el `sortRanking` real
// para el nuevo toggle "Por medallas"/"Por promedio", f-021) sin que ese
// import intermedio falle.
jest.mock('@/services/supabase', () => ({ supabase: {} }));

jest.mock('@/services/rankings', () => ({
  ...jest.requireActual('@/services/rankings'),
  listEditionRanking: jest.fn(),
}));

import EditionRankingDetailScreen from '@/app/(tabs)/rankings/editions/[id]';
import EditionRankingIndexScreen from '@/app/(tabs)/rankings/editions/index';
import { listEditions } from '@/services/editions';
import { listEditionRanking } from '@/services/rankings';
import { ThemeProvider } from '@/theme';

const mockListEditions = listEditions as jest.Mock;
const mockListEditionRanking = listEditionRanking as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('rankings/editions screens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'e1' });
    mockListEditions.mockResolvedValue([
      { id: 'e1', year: 2026, label: 'Verano', startDate: null, endDate: null, createdAt: '2026-01-01' },
    ]);
    mockListEditionRanking.mockResolvedValue([
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
        silver: 1,
        bronze: 0,
        total: 1,
        score: 2,
        participations: 1,
        scorePerParticipation: 2,
      },
    ]);
  });

  it('muestra selector publico de edicion y navega al detalle', async () => {
    await renderWithTheme(<EditionRankingIndexScreen />);

    await fireEvent.press(await screen.findByText('2026'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/rankings/editions/[id]',
      params: { id: 'e1' },
    });
  });

  it('muestra desglose de medallas, participaciones y promedio', async () => {
    await renderWithTheme(<EditionRankingDetailScreen />);

    expect(await screen.findByText('1. Ana')).toBeTruthy();
    expect(screen.getByLabelText('Oro 1 · Plata 0 · Bronce 1')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('4 pts · 3 part. · 1.33')).toBeTruthy());
    expect(mockListEditionRanking).toHaveBeenCalledWith('e1');
  });

  it('el toggle "Por promedio" reordena en cliente sin volver a consultar el servicio (f-021, R3)', async () => {
    await renderWithTheme(<EditionRankingDetailScreen />);

    await screen.findByText('1. Ana');
    expect(mockListEditionRanking).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByText('Por promedio'));

    await waitFor(() => expect(screen.getByText('1. Bea')).toBeTruthy());
    expect(screen.getByText('2. Ana')).toBeTruthy();
    expect(mockListEditionRanking).toHaveBeenCalledTimes(1);
  });
});
