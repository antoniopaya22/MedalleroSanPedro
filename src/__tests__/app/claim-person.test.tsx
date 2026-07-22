import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockSignOut = jest.fn();
const mockRefreshProfile = jest.fn();

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ signOut: mockSignOut, refreshProfile: mockRefreshProfile }),
}));

jest.mock('@/services/people', () => {
  class MockPersonAlreadyClaimedError extends Error {
    constructor() {
      super('Esa persona ya ha sido reclamada.');
      this.name = 'PersonAlreadyClaimedError';
    }
  }

  return {
    PersonAlreadyClaimedError: MockPersonAlreadyClaimedError,
    claimPerson: jest.fn(),
    listClaimablePeople: jest.fn(),
  };
});

import ClaimPersonScreen from '@/app/claim-person';
import { claimPerson, listClaimablePeople } from '@/services/people';
import { ThemeProvider } from '@/theme';

const mockClaimPerson = claimPerson as jest.Mock;
const mockListClaimablePeople = listClaimablePeople as jest.Mock;

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ClaimPersonScreen />
    </ThemeProvider>
  );
}

// Reclamar una persona es irreversible por el propio usuario (ADR 0002/0005):
// se pide confirmación con el nombre de por medio antes de llamar a
// `claimPerson` (plan de mejoras, fase 1).
describe('ClaimPersonScreen (confirmación antes de reclamar, plan de mejoras fase 1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListClaimablePeople.mockResolvedValue([
      { id: 'p1', name: 'Ana', active: true, claimedByUserId: null, createdAt: '2026-01-01' },
      { id: 'p2', name: 'Beto', active: true, claimedByUserId: null, createdAt: '2026-01-01' },
    ]);
  });

  it('pulsar "Confirmar" abre un diálogo de confirmación con el nombre elegido, sin reclamar todavía', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await renderWithTheme();

    await fireEvent.press(await screen.findByText('Ana'));
    await fireEvent.press(screen.getByText('Confirmar'));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Ana'),
      expect.any(Array)
    );
    expect(mockClaimPerson).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('confirmar el diálogo reclama a la persona y refresca el perfil', async () => {
    mockClaimPerson.mockResolvedValue(undefined);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find((button) => button.text === 'Confirmar');
      confirmButton?.onPress?.();
    });

    await renderWithTheme();

    await fireEvent.press(await screen.findByText('Beto'));
    await fireEvent.press(screen.getByText('Confirmar'));

    await waitFor(() => expect(mockClaimPerson).toHaveBeenCalledWith('p2'));
    expect(mockRefreshProfile).toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('cancelar el diálogo no reclama a nadie', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const cancelButton = buttons?.find((button) => button.text === 'Cancelar');
      cancelButton?.onPress?.();
    });

    await renderWithTheme();

    await fireEvent.press(await screen.findByText('Ana'));
    await fireEvent.press(screen.getByText('Confirmar'));

    expect(mockClaimPerson).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
