import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string | null;
}

export function TextField({ label, error, onFocus, onBlur, ...rest }: TextFieldProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: spacing.xxs }}>
      {label ? <Text variant="subtitle">{label}</Text> : null}

      <TextInput
        placeholderTextColor={colors.textTertiary}
        style={{
          height: 52,
          borderRadius: radius.md,
          borderWidth: 1.5,
          borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.sm,
          color: colors.textPrimary,
          fontFamily: typography.body.fontFamily,
          fontSize: typography.body.fontSize,
        }}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />

      {error ? (
        <Text variant="bodySmall" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
