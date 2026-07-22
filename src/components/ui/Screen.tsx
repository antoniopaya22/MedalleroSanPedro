import { RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

export interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  /** Gesto de "tirar para refrescar" (solo con `scroll`); omitir para no mostrarlo. */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  padded = true,
  style,
  contentContainerStyle,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const { colors, spacing } = useTheme();

  const paddingHorizontal = padded ? spacing.lg : 0;

  if (scroll) {
    return (
      <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }, style]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[{ paddingHorizontal, paddingBottom: spacing.xxl }, contentContainerStyle]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }, style]}>
      <View style={[styles.flex, { paddingHorizontal }, contentContainerStyle]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
