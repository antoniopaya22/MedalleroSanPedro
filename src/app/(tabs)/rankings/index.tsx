import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { HeroHeader, NavCard, Screen, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Hub de la pestaña Clasificaciones (f-014, R3): reúne los tres rankings ya
 * existentes (histórico, por edición, por actividad) sin reimplementar su
 * lógica, y el acceso al catálogo de actividades (R7), que quedaría orfano
 * al eliminar el home plano. Accesible sin sesión (R3.3): es solo lectura.
 */
export default function RankingsHubScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  return (
    <Screen scroll edges={['left', 'right']}>
      <HeroHeader eyebrow="MEDALLERO" title="Clasificaciones" subtitle="Quién ha ganado qué, edición a edición." />
      <View style={{ gap: spacing.xl }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textSecondary">
            RANKINGS
          </Text>
          <View style={{ gap: spacing.sm }}>
            <NavCard
              icon="trophy-outline"
              title="Clasificación histórica"
              subtitle="Ranking agregado de todas las ediciones"
              onPress={() => router.push('/rankings/historic')}
            />
            <NavCard
              icon="podium-outline"
              title="Clasificación por edición"
              subtitle="Medallas, participaciones y promedio"
              onPress={() => router.push('/rankings/editions')}
            />
            <NavCard
              icon="game-controller-outline"
              title="Clasificación por actividad"
              subtitle="Ranking por deporte o juego de mesa"
              onPress={() => router.push('/rankings/activities')}
            />
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Text variant="overline" color="textSecondary">
            GESTIÓN
          </Text>
          <NavCard
            icon="game-controller-outline"
            title="Catálogo de actividades"
            subtitle="Consulta y edita los juegos y deportes"
            onPress={() => router.push('/activities')}
            variant="flat"
          />
        </View>
      </View>
    </Screen>
  );
}
