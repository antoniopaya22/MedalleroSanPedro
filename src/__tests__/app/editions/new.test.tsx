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

jest.mock('@/services/editions', () => ({
  createEdition: jest.fn(),
  EditionYearTakenError: class EditionYearTakenError extends Error {},
}));

import NewEditionScreen from '@/app/(tabs)/editions/new';
import { useAuth } from '@/context/AuthContext';
import { createEdition } from '@/services/editions';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockCreateEdition = createEdition as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

describe('NewEditionScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('guarda de escritura (R4.2/R4.3)', () => {
    it('con canWrite=false no muestra el formulario y redirige al listado', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<NewEditionScreen />);

      expect(screen.queryByText('Año')).toBeNull();
      expect(screen.queryByText('Crear')).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith('/editions/index');
    });

    it('con canWrite=true muestra el TextField y el botón Crear, sin redirigir', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<NewEditionScreen />);

      expect(screen.getByText('Año')).toBeTruthy();
      expect(screen.getByText('Crear')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('validación de año (R1.3)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ canWrite: true });
    });

    it('con el año vacío no llama a createEdition y muestra el mensaje de validación', async () => {
      await renderWithTheme(<NewEditionScreen />);

      await fireEvent.press(screen.getByText('Crear'));

      expect(await screen.findByText('El año debe ser un número entero.')).toBeTruthy();
      expect(mockCreateEdition).not.toHaveBeenCalled();
    });

    it('con un año no entero no llama a createEdition y muestra el mensaje de validación', async () => {
      await renderWithTheme(<NewEditionScreen />);

      // El campo "Año" es el primer TextField del formulario (Año, Etiqueta,
      // Fecha de inicio, Fecha de fin comparten el mismo valor inicial vacío).
      const input = screen.getAllByDisplayValue('')[0];
      await fireEvent.changeText(input, '2024.5');
      await fireEvent.press(screen.getByText('Crear'));

      expect(await screen.findByText('El año debe ser un número entero.')).toBeTruthy();
      expect(mockCreateEdition).not.toHaveBeenCalled();
    });

    it('con un año válido llama a createEdition con el año', async () => {
      mockCreateEdition.mockResolvedValue({
        id: '1',
        year: 2024,
        label: null,
        startDate: null,
        endDate: null,
        createdAt: '2024-01-01',
      });

      await renderWithTheme(<NewEditionScreen />);

      const input = screen.getAllByDisplayValue('')[0];
      await fireEvent.changeText(input, '2024');
      await fireEvent.press(screen.getByText('Crear'));

      await waitFor(() =>
        expect(mockCreateEdition).toHaveBeenCalledWith({
          year: 2024,
          label: '',
          startDate: null,
          endDate: null,
        })
      );
      expect(screen.queryByText('El año debe ser un número entero.')).toBeNull();
    });
  });
});
