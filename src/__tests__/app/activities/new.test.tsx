import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactElement } from 'react';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(),
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

import NewActivityScreen from '@/app/activities/new';
import { useAuth } from '@/context/AuthContext';
import { ActivityNameTakenError, createActivity, listActivities } from '@/services/activities';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockCreateActivity = createActivity as jest.Mock;
const mockListActivities = listActivities as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

describe('NewActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListActivities.mockResolvedValue([]);
  });

  describe('guarda de escritura (R5.1/R5.2)', () => {
    it('con canWrite=false no muestra el formulario y redirige al catálogo', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<NewActivityScreen />);

      expect(screen.queryByText('Nombre')).toBeNull();
      expect(screen.queryByText('Crear')).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith('/activities/index');
    });

    it('con canWrite=true muestra el TextField y el botón Crear, sin redirigir', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<NewActivityScreen />);

      expect(screen.getByText('Nombre')).toBeTruthy();
      expect(screen.getByText('Crear')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('validación de nombre (R1.3)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ canWrite: true });
    });

    it('con el nombre vacío no llama a createActivity y muestra el mensaje de validación', async () => {
      await renderWithTheme(<NewActivityScreen />);

      await fireEvent.press(screen.getByText('Crear'));

      expect(await screen.findByText('El nombre no puede estar vacío.')).toBeTruthy();
      expect(mockCreateActivity).not.toHaveBeenCalled();
    });

    it('con un nombre válido llama a createActivity con el nombre', async () => {
      mockCreateActivity.mockResolvedValue({ id: '1', name: 'Petanca', createdAt: '2024-01-01' });

      await renderWithTheme(<NewActivityScreen />);

      const input = screen.getByDisplayValue('');
      await fireEvent.changeText(input, 'Petanca');
      await fireEvent.press(screen.getByText('Crear'));

      await waitFor(() => expect(mockCreateActivity).toHaveBeenCalledWith('Petanca'));
      expect(screen.queryByText('El nombre no puede estar vacío.')).toBeNull();
    });
  });

  describe('anti-duplicado (R1.5)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ canWrite: true });
    });

    it('cuando createActivity rechaza con ActivityNameTakenError muestra el mensaje de duplicado', async () => {
      mockCreateActivity.mockRejectedValue(new ActivityNameTakenError());

      await renderWithTheme(<NewActivityScreen />);

      const input = screen.getByDisplayValue('');
      await fireEvent.changeText(input, 'Fútbol');
      await fireEvent.press(screen.getByText('Crear'));

      expect(await screen.findByText('Ya existe una actividad con ese nombre.')).toBeTruthy();
    });

    it('muestra coincidencias en vivo mientras se escribe un nombre parecido a uno existente', async () => {
      mockListActivities.mockResolvedValue([{ id: '1', name: 'Fútbol', createdAt: '2024-01-01' }]);

      await renderWithTheme(<NewActivityScreen />);

      const input = await screen.findByDisplayValue('');
      await fireEvent.changeText(input, 'tbol');

      expect(
        await screen.findByText('Ya existe algo parecido — toca una para usar su nombre exacto y evitar un duplicado.')
      ).toBeTruthy();
      expect(await screen.findByText('Fútbol')).toBeTruthy();
    });
  });
});
