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

jest.mock('@/services/people', () => ({
  createPerson: jest.fn(),
}));

import NewPersonScreen from '@/app/(tabs)/people/new';
import { useAuth } from '@/context/AuthContext';
import { createPerson } from '@/services/people';
import { ThemeProvider } from '@/theme';

const mockUseAuth = useAuth as jest.Mock;
const mockCreatePerson = createPerson as jest.Mock;

function renderWithTheme(children: ReactElement) {
  return render(<ThemeProvider>{children}</ThemeProvider>);
}

describe('NewPersonScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('guarda de escritura (R5.1/R5.2)', () => {
    it('con canWrite=false no muestra el formulario y redirige al listado', async () => {
      mockUseAuth.mockReturnValue({ canWrite: false });

      await renderWithTheme(<NewPersonScreen />);

      expect(screen.queryByText('Nombre')).toBeNull();
      expect(screen.queryByText('Crear')).toBeNull();
      expect(mockReplace).toHaveBeenCalledWith('/people/index');
    });

    it('con canWrite=true muestra el TextField y el botón Crear, sin redirigir', async () => {
      mockUseAuth.mockReturnValue({ canWrite: true });

      await renderWithTheme(<NewPersonScreen />);

      expect(screen.getByText('Nombre')).toBeTruthy();
      expect(screen.getByText('Crear')).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  describe('validación de nombre (R1.3)', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({ canWrite: true });
    });

    it('con el nombre vacío no llama a createPerson y muestra el mensaje de validación', async () => {
      await renderWithTheme(<NewPersonScreen />);

      await fireEvent.press(screen.getByText('Crear'));

      expect(await screen.findByText('El nombre no puede estar vacío.')).toBeTruthy();
      expect(mockCreatePerson).not.toHaveBeenCalled();
    });

    it('con un nombre válido llama a createPerson con el nombre', async () => {
      mockCreatePerson.mockResolvedValue({
        id: '1',
        name: 'Ana',
        active: true,
        claimedByUserId: null,
        createdAt: '2024-01-01',
      });

      await renderWithTheme(<NewPersonScreen />);

      const input = screen.getByDisplayValue('');
      await fireEvent.changeText(input, 'Ana');
      await fireEvent.press(screen.getByText('Crear'));

      await waitFor(() => expect(mockCreatePerson).toHaveBeenCalledWith('Ana'));
      expect(screen.queryByText('El nombre no puede estar vacío.')).toBeNull();
    });
  });
});
