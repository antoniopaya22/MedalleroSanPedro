import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Button, Card, Divider, Screen, Text } from '@/components/ui';
import { SignInPrompt } from '@/components/SignInPrompt';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type SchemePreference } from '@/theme';

interface ThemeOption {
  value: SchemePreference;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: 'sunny-outline' },
  { value: 'dark', label: 'Oscuro', icon: 'moon-outline' },
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

/**
 * Pantalla de Ajustes (f-015): absorbe el contenido de cuenta/sesión que
 * antes vivía en el modal `/account` (R3) y añade el selector de tema (R4).
 * Ambas secciones están disponibles tanto para autenticados como invitados.
 */
export default function SettingsScreen() {
  const { spacing } = useTheme();
  const { isAuthenticated, user, signOut } = useAuth();

  return (
    <Screen scroll>
      <View style={{ paddingTop: spacing.lg, gap: spacing.xl }}>
        {isAuthenticated ? (
          <Card>
            <View style={{ gap: spacing.sm }}>
              <Text variant="title">Tu cuenta</Text>
              <Text variant="body" color="textSecondary">
                {user?.email ?? 'Sesión iniciada'}
              </Text>
              <Button label="Cerrar sesión" variant="outline" onPress={signOut} />
            </View>
          </Card>
        ) : (
          <SignInPrompt />
        )}

        <ThemeSection />
      </View>
    </Screen>
  );
}

function ThemeSection() {
  const { colors, spacing, preference, setPreference } = useTheme();

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">Tema</Text>
        {THEME_OPTIONS.map((option, index) => {
          const selected = preference === option.value;
          const color = selected ? colors.primary : colors.textSecondary;

          return (
            <View key={option.value}>
              {index > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => setPreference(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: spacing.sm,
                }}
              >
                <Ionicons name={option.icon} size={20} color={color} />
                <Text variant="body" style={{ color, flex: 1 }}>
                  {option.label}
                </Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </Pressable>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
