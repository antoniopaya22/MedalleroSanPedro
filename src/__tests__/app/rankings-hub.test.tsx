import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

import RankingsHubScreen from '@/app/(tabs)/rankings/index';
import { ThemeProvider } from '@/theme';

function renderWithTheme(children: ReactElement) {
  return render(
    <SafeAreaProvider
      initialMetrics={{ frame: { x: 0, y: 0, width: 320, height: 640 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
    >
      <ThemeProvider>{children}</ThemeProvider>
    </SafeAreaProvider>
  );
}

describe('RankingsHubScreen (R3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('muestra los 3 accesos a los rankings y el acceso al catálogo de actividades (R7)', async () => {
    await renderWithTheme(<RankingsHubScreen />);

    expect(screen.getByText('Clasificación histórica')).toBeTruthy();
    expect(screen.getByText('Clasificación por edición')).toBeTruthy();
    expect(screen.getByText('Clasificación por actividad')).toBeTruthy();
    expect(screen.getByText('Catálogo de actividades')).toBeTruthy();
  });

  it('navega a /rankings/historic al pulsar "Clasificación histórica"', async () => {
    await renderWithTheme(<RankingsHubScreen />);

    await fireEvent.press(screen.getByText('Clasificación histórica'));

    expect(mockPush).toHaveBeenCalledWith('/rankings/historic');
  });

  it('navega a /rankings/editions al pulsar "Clasificación por edición"', async () => {
    await renderWithTheme(<RankingsHubScreen />);

    await fireEvent.press(screen.getByText('Clasificación por edición'));

    expect(mockPush).toHaveBeenCalledWith('/rankings/editions');
  });

  it('navega a /rankings/activities al pulsar "Clasificación por actividad"', async () => {
    await renderWithTheme(<RankingsHubScreen />);

    await fireEvent.press(screen.getByText('Clasificación por actividad'));

    expect(mockPush).toHaveBeenCalledWith('/rankings/activities');
  });

  it('navega a /activities al pulsar "Catálogo de actividades"', async () => {
    await renderWithTheme(<RankingsHubScreen />);

    await fireEvent.press(screen.getByText('Catálogo de actividades'));

    expect(mockPush).toHaveBeenCalledWith('/activities');
  });
});
