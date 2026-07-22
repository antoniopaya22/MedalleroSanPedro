import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme';

export interface BrandIntroProps {
  title: string;
  subtitle: string;
  size?: number;
}

/**
 * Bloque de identidad (círculo con halo de marca + título + subtítulo)
 * compartido por Welcome y Sign-in, para que ambas pantallas no diverjan al
 * tocar solo una.
 */
export function BrandIntro({ title, subtitle, size = 64 }: BrandIntroProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: spacing.sm }}>
      <LinearGradient
        colors={[colors.gradientFrom, colors.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="medal" size={size * 0.5} color="#FFFFFF" />
      </LinearGradient>
      <Text variant="display" align="center">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" align="center">
        {subtitle}
      </Text>
    </View>
  );
}
