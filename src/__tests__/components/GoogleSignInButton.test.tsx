import { fireEvent, render, screen } from '@testing-library/react-native';

import { GoogleSignInButton } from '@/components/GoogleSignInButton';

describe('GoogleSignInButton', () => {
  it('muestra la etiqueta "Iniciar sesión con Google"', async () => {
    await render(<GoogleSignInButton onPress={jest.fn()} />);

    expect(screen.getByText('Iniciar sesión con Google')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Iniciar sesión con Google' })).toBeTruthy();
  });

  it('invoca onPress al pulsarla', async () => {
    const onPress = jest.fn();
    await render(<GoogleSignInButton onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar sesión con Google' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('en loading muestra un indicador y no la etiqueta, y deshabilita el botón', async () => {
    const onPress = jest.fn();
    await render(<GoogleSignInButton onPress={onPress} loading />);

    expect(screen.queryByText('Iniciar sesión con Google')).toBeNull();

    const button = screen.getByRole('button', { name: 'Iniciar sesión con Google' });
    await fireEvent.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });
});
