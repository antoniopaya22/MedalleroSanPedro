import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { GoogleGLogo } from './GoogleGLogo';

export interface GoogleSignInButtonProps {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Botón de "Iniciar sesión con Google" fiel a las Google Identity Guidelines
 * (R2.1/R2.2): fondo blanco, borde de marca `#747775`, logo oficial
 * multicolor de la "G" y etiqueta en sans-serif. No es un botón genérico de
 * la app con un icono monocromo.
 */
export function GoogleSignInButton({ onPress, loading = false, disabled = false }: GoogleSignInButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Iniciar sesión con Google"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [styles.base, { opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 }]}
    >
      {loading ? (
        <ActivityIndicator color="#1F1F1F" />
      ) : (
        <View style={styles.content}>
          <GoogleGLogo size={18} />
          <Text style={styles.label}>Iniciar sesión con Google</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: '#FFFFFF',
    borderColor: '#747775',
    borderWidth: 1,
    borderRadius: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  label: {
    // Sans-serif del sistema (Roboto en Android, San Francisco en iOS): no
    // se bundlea Roboto para no añadir infraestructura de fuentes (design.md
    // §4). No se especifica `fontFamily` para usar el default de la
    // plataforma, que ya es sans-serif en ambas.
    fontWeight: '500',
    fontSize: 15,
    color: '#1F1F1F',
  },
});
