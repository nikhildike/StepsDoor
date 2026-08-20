/**
 * Shared labeled text-input primitive used in forms (e.g. Login,
 * Register, Profile). Wraps React Native's `TextInput` with an optional
 * label above and an optional validation error message below, plus
 * themed border/placeholder colors.
 */
import React from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Props for `Input`. Extends all standard `TextInputProps` (value,
 * onChangeText, placeholder, secureTextEntry, keyboardType, etc.) plus:
 * - `label`: optional text rendered above the field.
 * - `error`: optional validation error message rendered below the
 *   field; when present also switches the field's border to the error
 *   color.
 * (`style` is destructured separately below and merged onto the
 * `TextInput` itself, not the outer wrapper.)
 */
interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

/**
 * Input
 *
 * Renders an optional label, a themed `TextInput`, and an optional
 * error message, in a vertical stack. All other `TextInputProps`
 * (value, onChangeText, placeholder, etc.) are passed through directly
 * to the underlying `TextInput` via `...props`. Used by form screens
 * such as Login, Register, and Profile editing.
 *
 * Props: see `Props` interface above.
 */
export function Input({ label, error, style, ...props }: Props) {
  return (
    <View>
      {/* Label is optional — only rendered when provided. */}
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        // Applies the error border style only when `error` is set, then
        // merges any caller-supplied `style` last so it can override.
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {/* Error message is optional — only rendered when validation fails. */}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing[4],
    fontSize: FontSize.base,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  inputError: { borderColor: Colors.error },
  error: { fontSize: FontSize.xs, color: Colors.error, marginTop: 4 },
});
