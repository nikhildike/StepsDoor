/**
 * SettingsScreen.tsx
 *
 * App settings screen, reached from `BurgerMenu`'s "Settings" item.
 * Currently holds one section — Theme preference (Light / Dark / System)
 * — backed by `themeStore` and persisted across app restarts. Registered
 * as a root-stack screen (see `navigation/index.tsx`) rather than nested
 * inside a tab, so it's reachable from anywhere via the burger menu and
 * gets a native back button.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore, ThemePreference } from '@/store/themeStore';
import { useAuth } from '@/hooks/useAuth';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';
import { ChangePasswordForm } from '@/components/common/ChangePasswordForm';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

// Theme option definitions: value stored/read from themeStore, plus the
// icon and label shown for each choice.
const THEME_OPTIONS: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/**
 * Renders the Settings screen: a "Preferences" section with a Theme
 * picker (three selectable rows). Reads no route params. Use case: the
 * app's one settings destination, reached via the burger menu.
 *
 * @remarks Picking a theme here persists the preference (`themeStore`)
 * and repaints the whole app live — every screen/component reads its
 * colours via `useThemeColors()` (see `theme/colors.ts`), which resolves
 * this preference (plus, under "System", the OS's own light/dark
 * setting via `useColorScheme()`) into the active palette.
 */
export function SettingsScreen() {
  const { theme, setTheme } = useThemeStore();
  const { isAuthenticated } = useAuth();
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.sectionHeading}>Preferences</Text>
        <Text style={styles.sectionLabel}>Theme</Text>
        <View style={styles.optionsCard}>
          {THEME_OPTIONS.map((option, index) => {
            const isSelected = theme === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionRow, index > 0 && styles.optionRowBorder]}
                onPress={() => setTheme(option.value)}
                activeOpacity={0.7}
              >
                <Ionicons name={option.icon as any} size={20} color={Colors.textSecondary} />
                <Text style={styles.optionLabel}>{option.label}</Text>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Only signed-in users have a password to change. */}
        {isAuthenticated && (
          <>
            <Text style={[styles.sectionHeading, { marginTop: Spacing[6] }]}>Account</Text>
            <ChangePasswordForm />
          </>
        )}
      </View>
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { padding: Spacing[5] },
  sectionHeading: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing[4],
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing[2],
  },
  optionsCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  optionRowBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  optionLabel: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.text,
  },
});
