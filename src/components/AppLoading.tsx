import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

/**
 * Pantalla de carga de marca, mostrada por `AuthGate` (`_layout.tsx`) mientras
 * se restaura la sesión (o no han terminado de cargar las fuentes). Sustituye
 * el frame en blanco que quedaba entre el splash nativo de Expo y el primer
 * contenido real de la app.
 */
export function AppLoading() {
  const { colors, spacing } = useTheme();
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();

    return () => loop.stop();
  }, [fade, pulse]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

  return (
    <LinearGradient
      colors={[colors.gradientFrom, colors.gradientTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        accessibilityRole="progressbar"
        accessibilityLabel="Cargando MedalleroSanPedro"
        style={{ alignItems: 'center', gap: spacing.lg, opacity: fade }}
      >
        <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
          <Animated.View
            style={{
              position: 'absolute',
              width: 96,
              height: 96,
              borderRadius: 48,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            }}
          />
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: 'rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="medal" size={36} color="#FFFFFF" />
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text variant="h2" style={{ color: '#FFFFFF' }}>
            MedalleroSanPedro
          </Text>
          <Text variant="body" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Cargando…
          </Text>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}
