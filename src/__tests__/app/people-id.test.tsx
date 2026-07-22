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

jest.mock('@/services/people', () => ({
  listPeople: jest.fn(),
  updatePerson: jest.fn(),
}));

// `rankings.ts` importa `./supabase`, que lanza si faltan las variables de
// entorno (no inyectadas por Jest, solo por el bundler de Expo en runtime).
// Se mockea como stub vacío para poder hacer `requireActual` de `rankings.ts`
// (necesitamos sus funciones puras reales, ver abajo) sin que ese import
// intermedio falle.
jest.mock('@/services/supabase', () => ({ supabase: {} }));

jest.mock('@/services/rankings', () => ({
  // `buildPersonEditionBreakdown`/`buildPersonActivityBreakdown` (f-018) son
  // agregaciones puras sin Supabase: se mantiene la implementación real y
  // solo se mockea `listPersonSummary` (llama a la capa de datos).
  ...jest.requireActual('@/services/rankings'),
  listPersonSummary: jest.fn(),
}));

jest.mock('@/services/activityResults', () => ({
  listPersonHistory: jest.fn(),
}));

import PersonDetailScreen from '@/app/(tabs)/people/[id]/index';
import EditPersonScreen from '@/app/(tabs)/people/[id]/edit';
import { useAuth } from '@/context/AuthContext';
import { listPersonHistory } from '@/services/activityResults';
import { listPeople, updatePerson } from '@/services/people';
import { listPersonSummary } from '@/services/rankings';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListPeople = listPeople as jest.Mock;
const mockUpdatePerson = updatePerson as jest.Mock;
const mockListPersonSummary = listPersonSummary as jest.Mock;
const mockListPersonHistory = listPersonHistory as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

const PEOPLE = [
  { id: 'p1', name: 'Ana', active: true, claimedByUserId: null, createdAt: '2026-01-01' },
  { id: 'p2', name: 'Inactiva Ines', active: false, claimedByUserId: null, createdAt: '2026-01-01' },
];

const SUMMARY = {
  personId: 'p1',
  personName: 'Ana',
  gold: 1,
  silver: 0,
  bronze: 1,
  total: 2,
  score: 4,
  participations: 3,
  scorePerParticipation: 4 / 3,
};

const HISTORY = [
  {
    resultId: 'r1',
    editionId: 'e1',
    editionYear: 2026,
    editionLabel: 'Verano',
    activityId: 'a1',
    activityName: 'Natación',
    playedAt: '2026-07-01',
    medal: 'gold' as const,
  },
  {
    resultId: 'r2',
    editionId: 'e1',
    editionYear: 2026,
    editionLabel: 'Verano',
    activityId: 'a2',
    activityName: 'Fútbol',
    playedAt: '2026-07-02',
    medal: null,
  },
];

describe('people/[id]/index (vista de detalle, f-017)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'p1' });
    mockListPeople.mockResolvedValue(PEOPLE);
    mockListPersonSummary.mockResolvedValue(SUMMARY);
    mockListPersonHistory.mockResolvedValue(HISTORY);
  });

  describe('acceso público (R2.1)', () => {
    it('muestra cabecera y resumen de medallas (pestaña "Resumen", por defecto) sin sesión (anónimo)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Ana')).toBeTruthy();
      expect(screen.getByText('2 medallas')).toBeTruthy();
      expect(mockListPersonSummary).toHaveBeenCalledWith('p1');
      expect(mockListPersonHistory).toHaveBeenCalledWith('p1');

      // Gráfico de puntos por edición (f-018, R1/R2), ya visible en la pestaña
      // por defecto: 1 edición (e1), 3 puntos (oro en Natación, Fútbol sin
      // medalla), 2 participaciones -> 1.50 promedio.
      expect(screen.getByText('Rendimiento por edición')).toBeTruthy();
      expect(screen.getByText('3 pts')).toBeTruthy();
      expect(screen.getByText('1.50 puntos/participación')).toBeTruthy();

      // El histórico y las actividades viven en sus propias pestañas (menos
      // scroll): no se muestran hasta cambiar de pestaña.
      expect(screen.queryByText('Natación')).toBeNull();
      expect(screen.queryByText('1. Natación')).toBeNull();
    });

    it('la pestaña "Histórico" muestra el histórico de pruebas de la persona', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PersonDetailScreen />);

      await screen.findByText('Ana');
      await fireEvent.press(screen.getByText('Histórico'));

      expect(screen.getByText('Natación')).toBeTruthy();
      expect(screen.getByText('Fútbol')).toBeTruthy();
      expect(screen.getByText('Participó sin medalla')).toBeTruthy();
    });

    it('la pestaña "Actividades" ordena las actividades por el propio mejor promedio de la persona (f-018, R3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PersonDetailScreen />);

      await screen.findByText('Ana');
      await fireEvent.press(screen.getByText('Actividades'));

      // Natación (3 pts/1 part. = 3.00) antes que Fútbol (0 pts/1 part. = 0.00).
      expect(screen.getByText('1. Natación')).toBeTruthy();
      expect(screen.getByText('2. Fútbol')).toBeTruthy();
      expect(screen.getByText('3.00')).toBeTruthy();
      expect(screen.getByText('3 pts · 1 part.')).toBeTruthy();
      expect(screen.getByText('0.00')).toBeTruthy();
      expect(screen.getByText('0 pts · 1 part.')).toBeTruthy();
    });

    it('agrega el gráfico por edición y ordena las actividades por su propio promedio, no por fecha (f-018)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListPersonHistory.mockResolvedValue([
        { resultId: 'r1', editionId: 'e2023', editionYear: 2023, editionLabel: null, activityId: 'a1', activityName: 'Dardos', playedAt: '2023-01-01', medal: 'bronze' },
        { resultId: 'r2', editionId: 'e2024', editionYear: 2024, editionLabel: 'Verano', activityId: 'a2', activityName: 'Ajedrez', playedAt: '2024-01-01', medal: 'gold' },
      ]);

      await renderWithTheme(<PersonDetailScreen />);

      await screen.findByText('Ana');

      // Una fila por edición en el gráfico, con sus puntos propios (1 = bronce, 3 = oro).
      expect(screen.getByText('1 pts')).toBeTruthy();
      expect(screen.getByText('3 pts')).toBeTruthy();

      await fireEvent.press(screen.getByText('Actividades'));

      // Ajedrez (oro, promedio 3) supera a Dardos (bronce, promedio 1) pese a
      // aparecer despues en el historico (orden por promedio propio, no por fecha).
      expect(screen.getByText('1. Ajedrez')).toBeTruthy();
      expect(screen.getByText('2. Dardos')).toBeTruthy();
    });

    it('no muestra el gráfico de edición ni actividades cuando la persona no tiene histórico (R4.1)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListPersonSummary.mockResolvedValue(null);
      mockListPersonHistory.mockResolvedValue([]);

      await renderWithTheme(<PersonDetailScreen />);

      await screen.findByText('Ana');

      expect(screen.queryByText('Rendimiento por edición')).toBeNull();

      await fireEvent.press(screen.getByText('Actividades'));
      expect(screen.getByText('Sin actividades')).toBeTruthy();
    });

    it('muestra el resumen en ceros y el histórico vacío cuando la persona no ha participado (R5.1)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListPersonSummary.mockResolvedValue(null);
      mockListPersonHistory.mockResolvedValue([]);

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Ana')).toBeTruthy();
      expect(screen.getByText('0 medallas')).toBeTruthy();

      await fireEvent.press(screen.getByText('Histórico'));
      expect(screen.getByText('Sin pruebas registradas')).toBeTruthy();
    });

    it('muestra "no encontrada" cuando el id de persona no existe (R5.2)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListPeople.mockResolvedValue([]);

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('No se ha encontrado esa persona.')).toBeTruthy();
    });

    it('muestra un error recuperable si falla la carga (R5.4)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockListPersonHistory.mockRejectedValue(new Error('fail'));

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('No se ha podido cargar la persona. Inténtalo de nuevo.')).toBeTruthy();
    });

    it('muestra el detalle y el histórico completos para una persona inactiva (R5.3)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });
      mockUseLocalSearchParams.mockReturnValue({ id: 'p2' });
      mockListPersonSummary.mockResolvedValue(null);
      mockListPersonHistory.mockResolvedValue([]);

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Inactiva Ines')).toBeTruthy();
      expect(screen.getByText('Inactiva')).toBeTruthy();
    });
  });

  describe('FAB y acceso a editar solo con canWrite (R3.1/R3.4/R3.5/R4.3)', () => {
    it('no muestra el FAB ni "Editar persona" cuando canWrite es false', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Ana')).toBeTruthy();
      expect(screen.queryByLabelText('Registrar resultado')).toBeNull();
      expect(screen.queryByText('Editar persona')).toBeNull();
    });

    it('muestra el FAB y navega a /results/new con el participante preseleccionado cuando la persona está activa', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Ana')).toBeTruthy();
      const fab = screen.getByLabelText('Registrar resultado');
      await fireEvent.press(fab);

      expect(mockPush).toHaveBeenCalledWith({ pathname: '/results/new', params: { participantId: 'p1' } });
    });

    it('oculta el FAB aunque canWrite sea true cuando la persona está inactiva (R3.5)', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });
      mockUseLocalSearchParams.mockReturnValue({ id: 'p2' });
      mockListPersonSummary.mockResolvedValue(null);
      mockListPersonHistory.mockResolvedValue([]);

      await renderWithTheme(<PersonDetailScreen />);

      expect(await screen.findByText('Inactiva Ines')).toBeTruthy();
      expect(screen.queryByLabelText('Registrar resultado')).toBeNull();
    });

    it('muestra "Editar persona" y navega a /people/[id]/edit', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<PersonDetailScreen />);

      await fireEvent.press(await screen.findByText('Editar persona'));

      expect(mockPush).toHaveBeenCalledWith({ pathname: '/people/[id]/edit', params: { id: 'p1' } });
    });
  });
});

describe('people/[id]/edit (formulario reubicado, f-017)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ id: 'p1' });
    mockListPeople.mockResolvedValue(PEOPLE);
  });

  it('sin canWrite redirige a la vista de detalle y no muestra el formulario (R4.2)', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<EditPersonScreen />);

    expect(screen.queryByText('Guardar')).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/people/[id]', params: { id: 'p1' } }));
  });

  it('con canWrite muestra el formulario con los datos de la persona', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });

    await renderWithTheme(<EditPersonScreen />);

    expect(await screen.findByText('Guardar')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('permite renombrar la persona', async () => {
    mockUseAuth.mockReturnValue({ canWrite: true });
    mockUpdatePerson.mockResolvedValue({ ...PEOPLE[0], name: 'Ana Actualizada' });

    await renderWithTheme(<EditPersonScreen />);

    await screen.findByText('Guardar');
    await fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => expect(mockUpdatePerson).toHaveBeenCalledWith('p1', { name: 'Ana' }));
  });
});
