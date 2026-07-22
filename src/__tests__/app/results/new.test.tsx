import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockRouter = { replace: mockReplace, back: mockBack };
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/services/editions', () => ({
  listEditions: jest.fn(),
}));

jest.mock('@/services/activities', () => {
  class MockActivityNameTakenError extends Error {
    constructor() {
      super('Ya existe una actividad con ese nombre.');
      this.name = 'ActivityNameTakenError';
    }
  }

  return {
    ActivityNameTakenError: MockActivityNameTakenError,
    createActivity: jest.fn(),
    listActivities: jest.fn(),
  };
});

jest.mock('@/services/people', () => ({
  listPeople: jest.fn(),
}));

jest.mock('@/services/activityResults', () => ({
  createActivityResult: jest.fn(),
  updateActivityResult: jest.fn(),
  deleteActivityResult: jest.fn(),
  getActivityResultDetail: jest.fn(),
}));

import { Alert } from 'react-native';

import NewResultScreen from '@/app/results/new';
import { useAuth } from '@/context/AuthContext';
import { ActivityNameTakenError, createActivity, listActivities } from '@/services/activities';
import {
  createActivityResult,
  deleteActivityResult,
  getActivityResultDetail,
  updateActivityResult,
} from '@/services/activityResults';
import { listEditions } from '@/services/editions';
import { listPeople } from '@/services/people';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockListEditions = listEditions as jest.Mock;
const mockListActivities = listActivities as jest.Mock;
const mockCreateActivity = createActivity as jest.Mock;
const mockListPeople = listPeople as jest.Mock;
const mockCreateActivityResult = createActivityResult as jest.Mock;
const mockUpdateActivityResult = updateActivityResult as jest.Mock;
const mockDeleteActivityResult = deleteActivityResult as jest.Mock;
const mockGetActivityResultDetail = getActivityResultDetail as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

// Navega el asistente completo hasta el paso Resumen, dejando edición,
// actividad, participante (Ana) y medalla de oro elegidos. Reutilizable por
// los tests que solo necesitan llegar al Resumen o guardar.
async function goToSummaryWithMinimalSelection() {
  await fireEvent.press(await screen.findByText('2026'));
  await fireEvent.press(screen.getByText('Siguiente'));

  await fireEvent.press(await screen.findByText('Fútbol'));
  await fireEvent.press(screen.getByText('Siguiente'));

  await fireEvent.press(await screen.findByText('Ana'));
  await fireEvent.press(screen.getByText('Siguiente'));

  // Paso Medallas: Oro/Plata/Bronce en ese orden, "Ana" aparece una vez por
  // color; la primera ocurrencia corresponde a Oro.
  await waitFor(() => expect(screen.getAllByText('Ana').length).toBe(3));
  await fireEvent.press(screen.getAllByText('Ana')[0]);
  await fireEvent.press(screen.getByText('Siguiente'));

  await screen.findByText('Paso 5 de 6');
  await fireEvent.press(screen.getByText('Siguiente'));

  await screen.findByText('Paso 6 de 6');
}

describe('NewResultScreen (asistente por pasos)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ canWrite: true });
    mockUseLocalSearchParams.mockReturnValue({});
    mockListEditions.mockResolvedValue([
      { id: 'e1', year: 2026, label: 'Verano', startDate: null, endDate: null, createdAt: '2026-01-01' },
    ]);
    mockListActivities.mockResolvedValue([{ id: 'a1', name: 'Fútbol', createdAt: '2026-01-01' }]);
    mockListPeople.mockResolvedValue([
      { id: 'p1', name: 'Ana', active: true, claimedByUserId: null, createdAt: '2026-01-01' },
      { id: 'p2', name: 'Bea', active: true, claimedByUserId: null, createdAt: '2026-01-01' },
      { id: 'p3', name: 'Cris', active: false, claimedByUserId: null, createdAt: '2026-01-01' },
    ]);
    mockCreateActivityResult.mockResolvedValue({
      id: 'r1',
      editionId: 'e1',
      activityId: 'a1',
      participantIds: ['p1'],
      playedAt: null,
      notes: null,
      createdByUserId: 'u1',
      createdAt: '2026-07-20',
    });
  });

  it('con canWrite=false no muestra el asistente y redirige a home', async () => {
    mockUseAuth.mockReturnValue({ canWrite: false });

    await renderWithTheme(<NewResultScreen />);

    expect(screen.queryByText('Paso 1 de 6')).toBeNull();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('arranca mostrando un solo paso (Edición) con el indicador "Paso 1 de 6"', async () => {
    await renderWithTheme(<NewResultScreen />);

    expect(await screen.findByText('Paso 1 de 6')).toBeTruthy();
    expect(screen.getAllByText('Edición').length).toBeGreaterThan(0);
    // El paso Actividad todavía no se muestra.
    expect(screen.queryByText('Buscar o crear actividad')).toBeNull();
    // En el primer paso no hay botón "Atrás".
    expect(screen.queryByText('Atrás')).toBeNull();
  });

  it('no avanza desde Edición sin edición elegida, y avanza tras corregir', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('Siguiente'));
    expect(await screen.findByText('Elige una edición.')).toBeTruthy();
    expect(screen.queryByText('Paso 2 de 6')).toBeNull();

    await fireEvent.press(screen.getByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 2 de 6')).toBeTruthy();
    expect(screen.queryByText('Elige una edición.')).toBeNull();
  });

  it('no avanza desde Actividad sin actividad elegida, y avanza tras corregir', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));

    await fireEvent.press(await screen.findByText('Siguiente'));
    expect(await screen.findByText('Elige una actividad.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 3 de 6')).toBeTruthy();
  });

  it('permite crear una actividad nueva y seleccionarla desde el paso Actividad (R2.2)', async () => {
    mockCreateActivity.mockResolvedValue({ id: 'a2', name: 'Natación', createdAt: '2026-01-02' });

    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));

    const activityInput = await screen.findByDisplayValue('');
    await fireEvent.changeText(activityInput, 'Natación');
    await fireEvent.press(screen.getByText('Crear y seleccionar actividad'));

    await waitFor(() => expect(mockCreateActivity).toHaveBeenCalledWith('Natación'));
    expect(await screen.findByText('Actividad elegida: Natación')).toBeTruthy();

    // La actividad recién creada queda seleccionada: avanza sin pedir elegir una.
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(await screen.findByText('Paso 3 de 6')).toBeTruthy();
    expect(screen.queryByText('Elige una actividad.')).toBeNull();
  });

  it('si la actividad ya existe muestra el error de ActivityNameTakenError sin romper el flujo (R2.2)', async () => {
    mockCreateActivity.mockRejectedValue(new ActivityNameTakenError());

    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));

    const activityInput = await screen.findByDisplayValue('');
    await fireEvent.changeText(activityInput, 'Fútbol');
    await fireEvent.press(screen.getByText('Crear y seleccionar actividad'));

    expect(await screen.findByText('Ya existe una actividad con ese nombre.')).toBeTruthy();

    // El flujo sigue disponible: no hay actividad seleccionada, así que
    // intentar avanzar muestra el mensaje de validación habitual, y se
    // puede elegir la actividad existente que ya estaba en la lista.
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(await screen.findByText('Elige una actividad.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(await screen.findByText('Paso 3 de 6')).toBeTruthy();
  });

  it('no avanza desde Participantes sin nadie elegido, y avanza tras corregir', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));

    await fireEvent.press(await screen.findByText('Siguiente'));
    expect(await screen.findByText('Selecciona al menos un participante.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ana'));
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 4 de 6')).toBeTruthy();
  });

  it('no avanza desde Medallas sin ninguna asignada, y avanza tras corregir', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Ana'));
    await fireEvent.press(screen.getByText('Siguiente'));

    await fireEvent.press(await screen.findByText('Siguiente'));
    expect(await screen.findByText('Asigna al menos una medalla.')).toBeTruthy();

    await waitFor(() => expect(screen.getAllByText('Ana').length).toBe(3));
    await fireEvent.press(screen.getAllByText('Ana')[0]);
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 5 de 6')).toBeTruthy();
  });

  it('permite avanzar desde Detalles sin fecha ni notas', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Ana'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await waitFor(() => expect(screen.getAllByText('Ana').length).toBe(3));
    await fireEvent.press(screen.getAllByText('Ana')[0]);
    await fireEvent.press(screen.getByText('Siguiente'));

    await screen.findByText('Paso 5 de 6');
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 6 de 6')).toBeTruthy();
    expect(screen.getByText('Guardar prueba')).toBeTruthy();
  });

  it('Atrás conserva las selecciones ya hechas', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));

    await fireEvent.press(screen.getByText('Atrás'));
    expect(await screen.findByText('Paso 1 de 6')).toBeTruthy();

    // Al volver a avanzar no pide elegir edición de nuevo: la selección
    // previa se conservó.
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(await screen.findByText('Paso 2 de 6')).toBeTruthy();
    expect(await screen.findByText('Actividad elegida: Fútbol')).toBeTruthy();
    expect(screen.queryByText('Elige una edición.')).toBeNull();
  });

  it('deseleccionar a un participante con medalla ya asignada le quita también la medalla (R7.2)', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));

    // Participantes: Ana y Bea.
    await fireEvent.press(await screen.findByText('Ana'));
    await fireEvent.press(screen.getByText('Bea'));
    await fireEvent.press(screen.getByText('Siguiente'));

    // Medallas: con dos participantes, cada nombre aparece una vez por color.
    await waitFor(() => expect(screen.getAllByText('Ana').length).toBe(3));
    await fireEvent.press(screen.getAllByText('Ana')[0]); // Oro para Ana

    await fireEvent.press(screen.getByText('Atrás'));
    expect(await screen.findByText('Paso 3 de 6')).toBeTruthy();

    // Deselecciona a Ana como participante: debe perder también la medalla de oro.
    await fireEvent.press(screen.getByText('Ana'));
    await fireEvent.press(screen.getByText('Siguiente'));

    // Ahora solo Bea es participante; Ana ya no aparece en el paso Medallas.
    await waitFor(() => expect(screen.getAllByText('Bea').length).toBe(3));
    expect(screen.queryByText('Ana')).toBeNull();

    // Si la medalla de Ana no se hubiera limpiado, "medals.gold" seguiría
    // teniendo contenido y se podría avanzar sin asignar nada a Bea. Este
    // mensaje solo aparece si la medalla previa fue correctamente retirada.
    await fireEvent.press(screen.getByText('Siguiente'));
    expect(await screen.findByText('Asigna al menos una medalla.')).toBeTruthy();

    // Asigna oro a Bea y comprueba en el Resumen que Ana ya no tiene medalla.
    await fireEvent.press(screen.getAllByText('Bea')[0]);
    await fireEvent.press(screen.getByText('Siguiente'));
    await screen.findByText('Paso 5 de 6');
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Oro: Bea')).toBeTruthy();
    expect(screen.queryByText(/Ana/)).toBeNull();
  });

  it('el Resumen muestra edición, actividad, participante y medalla elegidos', async () => {
    await renderWithTheme(<NewResultScreen />);
    await goToSummaryWithMinimalSelection();

    expect(screen.getByText(/2026/)).toBeTruthy();
    expect(screen.getByText('Fútbol')).toBeTruthy();
    expect(screen.getByText('Ana')).toBeTruthy();
    expect(screen.getByText('Oro: Ana')).toBeTruthy();
    expect(screen.getByText('Plata: -')).toBeTruthy();
    expect(screen.getByText('Bronce: -')).toBeTruthy();
  });

  it('editar un paso desde el Resumen y volver refleja el cambio (R4.3)', async () => {
    await renderWithTheme(<NewResultScreen />);
    await goToSummaryWithMinimalSelection();

    await fireEvent.press(screen.getByText('Editar detalles'));
    expect(await screen.findByText('Paso 5 de 6')).toBeTruthy();

    // El paso Detalles tiene dos TextField vacíos (Fecha, Notas); el segundo
    // es el de notas.
    const notesInput = screen.getAllByDisplayValue('')[1];
    await fireEvent.changeText(notesInput, 'Buen ambiente');
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Paso 6 de 6')).toBeTruthy();
    expect(screen.getByText('Notas: Buen ambiente')).toBeTruthy();
  });

  it('guarda la prueba desde el Resumen con el mismo payload que el formulario original', async () => {
    await renderWithTheme(<NewResultScreen />);
    await goToSummaryWithMinimalSelection();

    await fireEvent.press(screen.getByText('Guardar prueba'));

    await waitFor(() =>
      expect(mockCreateActivityResult).toHaveBeenCalledWith({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1'],
        playedAt: null,
        notes: '',
        medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
      })
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('si el guardado falla permanece en el Resumen mostrando el error', async () => {
    mockCreateActivityResult.mockRejectedValue(new Error('No se pudo guardar.'));

    await renderWithTheme(<NewResultScreen />);
    await goToSummaryWithMinimalSelection();

    await fireEvent.press(screen.getByText('Guardar prueba'));

    expect(await screen.findByText('No se pudo guardar.')).toBeTruthy();
    expect(await screen.findByText('Paso 6 de 6')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('solo muestra personas activas para participar', async () => {
    await renderWithTheme(<NewResultScreen />);

    await fireEvent.press(await screen.findByText('2026'));
    await fireEvent.press(screen.getByText('Siguiente'));
    await fireEvent.press(await screen.findByText('Fútbol'));
    await fireEvent.press(screen.getByText('Siguiente'));

    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.queryByText('Cris')).toBeNull();
  });

  it('muestra el error si fallan las cargas iniciales (R7.1)', async () => {
    mockListEditions.mockRejectedValue(new Error('boom'));

    await renderWithTheme(<NewResultScreen />);

    expect(await screen.findByText('No se han podido cargar los datos para registrar la prueba.')).toBeTruthy();
  });

  describe('preselección de edición vía param (f-016, R5.1/R5.3)', () => {
    it('arranca directamente en Actividad con la edición ya fijada', async () => {
      mockUseLocalSearchParams.mockReturnValue({ editionId: 'e1' });

      await renderWithTheme(<NewResultScreen />);

      expect(await screen.findByText('Paso 2 de 6')).toBeTruthy();
      expect(screen.queryByText('Elige una edición.')).toBeNull();

      await fireEvent.press(await screen.findByText('Fútbol'));
      await fireEvent.press(screen.getByText('Siguiente'));
      await fireEvent.press(await screen.findByText('Ana'));
      await fireEvent.press(screen.getByText('Siguiente'));
      await waitFor(() => expect(screen.getAllByText('Ana').length).toBe(3));
      await fireEvent.press(screen.getAllByText('Ana')[0]);
      await fireEvent.press(screen.getByText('Siguiente'));
      await fireEvent.press(await screen.findByText('Siguiente'));
      await fireEvent.press(await screen.findByText('Guardar prueba'));

      await waitFor(() =>
        expect(mockCreateActivityResult).toHaveBeenCalledWith(expect.objectContaining({ editionId: 'e1' }))
      );
    });

    it('ignora un editionId que no coincide con ninguna edición cargada y arranca en Edición', async () => {
      mockUseLocalSearchParams.mockReturnValue({ editionId: 'no-existe' });

      await renderWithTheme(<NewResultScreen />);

      expect(await screen.findByText('Paso 1 de 6')).toBeTruthy();
    });
  });

  describe('preselección de participante vía param (f-017, R5.2/R5.3)', () => {
    it('arranca en Edición (no se salta el paso obligatorio) con la persona ya en participantes', async () => {
      mockUseLocalSearchParams.mockReturnValue({ participantId: 'p1' });

      await renderWithTheme(<NewResultScreen />);

      expect(await screen.findByText('Paso 1 de 6')).toBeTruthy();

      await fireEvent.press(screen.getByText('2026'));
      await fireEvent.press(screen.getByText('Siguiente'));
      await fireEvent.press(await screen.findByText('Fútbol'));
      await fireEvent.press(screen.getByText('Siguiente'));

      // Ana ya está marcada como participante sin que el usuario la pulse:
      // avanzar sin tocar nada no da error de "selecciona un participante".
      await fireEvent.press(screen.getByText('Siguiente'));
      expect(screen.queryByText('Selecciona al menos un participante.')).toBeNull();
      expect(await screen.findByText('Paso 4 de 6')).toBeTruthy();
    });

    it('no preselecciona un participantId que corresponde a una persona inactiva', async () => {
      mockUseLocalSearchParams.mockReturnValue({ participantId: 'p3' });

      await renderWithTheme(<NewResultScreen />);

      await fireEvent.press(await screen.findByText('2026'));
      await fireEvent.press(screen.getByText('Siguiente'));
      await fireEvent.press(await screen.findByText('Fútbol'));
      await fireEvent.press(screen.getByText('Siguiente'));

      await fireEvent.press(await screen.findByText('Siguiente'));
      expect(await screen.findByText('Selecciona al menos un participante.')).toBeTruthy();
    });
  });

  describe('preselección de edición y participante combinadas (R5.3)', () => {
    it('arranca en Actividad con la edición fijada y la persona ya en participantes', async () => {
      mockUseLocalSearchParams.mockReturnValue({ editionId: 'e1', participantId: 'p1' });

      await renderWithTheme(<NewResultScreen />);

      expect(await screen.findByText('Paso 2 de 6')).toBeTruthy();

      await fireEvent.press(await screen.findByText('Fútbol'));
      await fireEvent.press(screen.getByText('Siguiente'));

      await fireEvent.press(screen.getByText('Siguiente'));
      expect(screen.queryByText('Selecciona al menos un participante.')).toBeNull();
      expect(await screen.findByText('Paso 4 de 6')).toBeTruthy();
    });
  });

  describe('modo edición vía resultId (plan de mejoras, fase 1)', () => {
    beforeEach(() => {
      mockUseLocalSearchParams.mockReturnValue({ resultId: 'r1' });
      mockGetActivityResultDetail.mockResolvedValue({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1'],
        playedAt: '2026-07-20',
        notes: 'Final ajustada',
        medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
      });
      mockUpdateActivityResult.mockResolvedValue({
        id: 'r1',
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p1'],
        playedAt: '2026-07-20',
        notes: 'Final ajustada',
        createdByUserId: 'u1',
        createdAt: '2026-07-20',
      });
      mockDeleteActivityResult.mockResolvedValue(undefined);
    });

    it('precarga la prueba y arranca directamente en el Resumen', async () => {
      await renderWithTheme(<NewResultScreen />);

      expect(await screen.findByText('Paso 6 de 6')).toBeTruthy();
      expect(mockGetActivityResultDetail).toHaveBeenCalledWith('r1');
      expect(screen.getByText('2026 · Verano')).toBeTruthy();
      expect(screen.getByText('Fútbol')).toBeTruthy();
      expect(screen.getByText('Ana')).toBeTruthy();
      expect(screen.getByText('Oro: Ana')).toBeTruthy();
      expect(screen.getByText('Notas: Final ajustada')).toBeTruthy();
      expect(screen.getByText('Guardar cambios')).toBeTruthy();
      expect(screen.getByText('Eliminar prueba')).toBeTruthy();
    });

    it('guardar cambios llama a updateActivityResult con el resultId y vuelve atrás', async () => {
      await renderWithTheme(<NewResultScreen />);

      await screen.findByText('Paso 6 de 6');
      await fireEvent.press(screen.getByText('Guardar cambios'));

      await waitFor(() =>
        expect(mockUpdateActivityResult).toHaveBeenCalledWith('r1', {
          editionId: 'e1',
          activityId: 'a1',
          participantIds: ['p1'],
          playedAt: '2026-07-20',
          notes: 'Final ajustada',
          medalAwards: [{ medal: 'gold', personIds: ['p1'] }],
        })
      );
      expect(mockCreateActivityResult).not.toHaveBeenCalled();
      expect(mockBack).toHaveBeenCalled();
    });

    it('eliminar prueba pide confirmación y, al confirmar, borra y vuelve atrás', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
        const confirmButton = buttons?.find((button) => button.text === 'Eliminar');
        confirmButton?.onPress?.();
      });

      await renderWithTheme(<NewResultScreen />);

      await screen.findByText('Paso 6 de 6');
      await fireEvent.press(screen.getByText('Eliminar prueba'));

      expect(alertSpy).toHaveBeenCalled();
      await waitFor(() => expect(mockDeleteActivityResult).toHaveBeenCalledWith('r1'));
      expect(mockBack).toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('incluye a un participante inactivo (histórico) en vez de ocultarlo', async () => {
      mockGetActivityResultDetail.mockResolvedValue({
        editionId: 'e1',
        activityId: 'a1',
        participantIds: ['p3'],
        playedAt: null,
        notes: null,
        medalAwards: [{ medal: 'gold', personIds: ['p3'] }],
      });

      await renderWithTheme(<NewResultScreen />);

      await screen.findByText('Paso 6 de 6');
      expect(screen.getByText('Cris')).toBeTruthy();
      expect(screen.getByText('Oro: Cris')).toBeTruthy();
    });
  });
});
