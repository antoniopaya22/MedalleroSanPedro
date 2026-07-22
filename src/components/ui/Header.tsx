import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';

import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title, subtitle, showBack = false, onBack, rightAction }: HeaderProps) {
  const { spacing, colors } = useTheme();

  return (
    <View style={[styles.row, { paddingVertical: spacing.md }]}>
      <View style={styles.side}>
        {showBack && (
          <IconButton name="chevron-back" accessibilityLabel="Volver" onPress={onBack ?? (() => router.back())} />
        )}
      </View>

      <View style={styles.center}>
        <Text variant="h2" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="subtitle" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideEnd]}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideEnd: {
    alignItems: 'flex-end',
  },
  center: {
    flex: 1,
    gap: 2,
  },
});
