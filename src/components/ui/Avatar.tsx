import { Image, View } from 'react-native';

import { useTheme } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { Text } from './Text';

export interface AvatarProps {
  name: string;
  imageUri?: string;
  size?: number;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '');
  return initials.join('') || '?';
}

// Paleta corta (tokens ya existentes del tema, ninguno nuevo) para que los
// avatares no salgan todos del mismo color: se elige uno por hash del nombre,
// determinista (mismo nombre -> mismo color siempre).
const TINT_KEYS: (keyof ThemeColors)[] = ['primary', 'accent', 'info', 'success', 'warning'];

function tintFor(name: string): keyof ThemeColors {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return TINT_KEYS[Math.abs(hash) % TINT_KEYS.length];
}

export function Avatar({ name, imageUri, size = 44 }: AvatarProps) {
  const { colors } = useTheme();

  if (imageUri) {
    return (
      <Image
        source={{ uri: imageUri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name}
      />
    );
  }

  const tint = colors[tintFor(name)];

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${tint}1F`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant="title" style={{ color: tint, fontSize: size * 0.4 }}>
        {initialsFrom(name)}
      </Text>
    </View>
  );
}
