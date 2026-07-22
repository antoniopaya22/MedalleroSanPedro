import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

const mockReplace = jest.fn();
const mockUseSegments = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockUseSegments(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/AppLoading', () => ({
  AppLoading: () => {
    const { Text: RNText } = require('react-native');
    return <RNText>cargando</RNText>;
  },
}));

import { AuthGate } from '@/app/_layout';

const AUTH_DEFAULTS = {
  loading: false,
  isAuthenticated: false,
  hasClaimedPerson: false,
  guestChosen: false,
};

describe('AuthGate (_layout)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSegments.mockReturnValue([]);
  });

  it('sin sesión, sin invitado elegido, fuera de welcome/sign-in → redirige a /welcome (R1.1/R1.3)', async () => {
    mockUseAuth.mockReturnValue(AUTH_DEFAULTS);
    mockUseSegments.mockReturnValue(['people']);

    await render(
      <AuthGate fontsReady>
        <Text>contenido</Text>
      </AuthGate>
    );

    expect(mockReplace).toHaveBeenCalledWith('/welcome');
  });

  it('sin sesión pero con guestChosen → NO redirige a /welcome (R1.3/R5.2)', async () => {
    mockUseAuth.mockReturnValue({ ...AUTH_DEFAULTS, guestChosen: true });
    mockUseSegments.mockReturnValue(['people']);

    await render(
      <AuthGate fontsReady>
        <Text>contenido</Text>
      </AuthGate>
    );

    expect(mockReplace).not.toHaveBeenCalledWith('/welcome');
  });

  it('con sesión sin Person reclamada, estando en /welcome → precedencia: redirige a /claim-person (R1.4)', async () => {
    mockUseAuth.mockReturnValue({
      ...AUTH_DEFAULTS,
      isAuthenticated: true,
      hasClaimedPerson: false,
    });
    mockUseSegments.mockReturnValue(['welcome']);

    await render(
      <AuthGate fontsReady>
        <Text>contenido</Text>
      </AuthGate>
    );

    expect(mockReplace).toHaveBeenCalledWith('/claim-person');
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('con loading=true no decide navegación todavía (no llama a router.replace)', async () => {
    mockUseAuth.mockReturnValue({ ...AUTH_DEFAULTS, loading: true });
    mockUseSegments.mockReturnValue(['people']);

    await render(
      <AuthGate fontsReady>
        <Text>contenido</Text>
      </AuthGate>
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('cargando')).toBeTruthy();
  });

  it('con fontsReady=false no decide navegación todavía, aunque loading ya sea false (bloqueante R1.2)', async () => {
    mockUseAuth.mockReturnValue(AUTH_DEFAULTS);
    mockUseSegments.mockReturnValue(['people']);

    await render(
      <AuthGate fontsReady={false}>
        <Text>contenido</Text>
      </AuthGate>
    );

    expect(mockReplace).not.toHaveBeenCalled();
    expect(screen.getByText('cargando')).toBeTruthy();
  });
});
