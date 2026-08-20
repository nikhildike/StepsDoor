/**
 * Shared pressable button primitive used across auth/company/seeker
 * screens (e.g. Login/Register submit buttons, form actions). Supports
 * primary/secondary/outline visual variants and a built-in loading
 * spinner state.
 */
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

/**
 * Props for `Button`.
 * - `onPress`: handler invoked on tap (ignored while disabled/loading,
 *   since `TouchableOpacity` is disabled in that state).
 * - `title`: label text shown when not loading.
 * - `variant`: visual style — 'primary' | 'secondary' | 'outline'.
 *   Defaults to 'primary' when omitted.
 * - `loading`: when true, replaces the label with an `ActivityIndicator`
 *   and disables the button. No default (falsy/undefined = not loading).
 * - `disabled`: explicitly disables the button regardless of `loading`.
 *   No default (falsy/undefined = enabled).
 * - `style`: optional extra `ViewStyle` merged onto the button container,
 *   applied after the variant styles so it can override them.
 */
interface Props {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * Button
 *
 * Renders a `TouchableOpacity` styled per `variant`, showing either the
 * `title` text or a loading spinner. Used throughout the app wherever a
 * primary/secondary/outline action button is needed (forms, screen
 * actions, empty-state CTAs, etc.).
 *
 * Props: see `Props` interface above.
 */
export function Button({ onPress, title, variant = 'primary', loading, disabled, style }: Props) {
  // Button is non-interactive while explicitly disabled OR while a request is in flight (loading).
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      // styles[variant] applies the variant-specific background/border;
      // `disabled` style (reduced opacity) is applied conditionally when isDisabled is true.
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        // Loading state: show a spinner instead of the label. Spinner color
        // flips to the theme primary color on the 'outline' variant (which
        // has a transparent background) so it stays visible, otherwise white.
        <ActivityIndicator color={variant === 'outline' ? Colors.primary : Colors.white} />
      ) : (
        // Default state: show the button's label text. Outline variant uses
        // the primary-colored text style instead of white, to match its
        // transparent-background/bordered look.
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  primary: { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.secondary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  disabled: { opacity: 0.5 },
  text: { color: Colors.white, fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  outlineText: { color: Colors.primary },
});
