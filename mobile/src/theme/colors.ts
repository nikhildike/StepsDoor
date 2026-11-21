/**
 * theme/colors.ts
 *
 * Light and dark colour palettes, plus `useThemeColors()` — the hook
 * every screen/component calls to get the active one. Per project
 * convention, components must call this hook (`const Colors =
 * useThemeColors()`) rather than importing a static palette or
 * hardcoding hex values, so the whole app repaints live when the user
 * changes Settings > Theme (see `store/themeStore.ts`), including
 * "System" following the OS's own light/dark setting.
 *
 * Style objects built from `Colors` must live inside the component (or a
 * `makeStyles(Colors)` factory called from inside it), never in a
 * module-level `StyleSheet.create(...)` — that runs once at import time
 * and would freeze whichever palette was active on first load.
 */
import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

export const LightColors = {
  // Primary brand colour — use for primary buttons, active tab/nav
  // states, links, and other main call-to-action elements.
  primary: '#1D4ED8',       // Blue — brand colour
  // Light tint of primary — use for subtle backgrounds/badges behind
  // primary-coloured content (e.g. selected filter chips, info banners).
  primaryLight: '#DBEAFE',
  // Darker shade of primary — use for pressed/active states of primary
  // elements or text needing extra contrast on light backgrounds.
  primaryDark: '#1E3A8A',
  // Secondary/accent colour — use sparingly for highlights that should
  // stand out from primary actions (e.g. badges, promotional callouts).
  secondary: '#F59E0B',     // Amber — accent
  // App/screen background colour (behind cards and surfaces).
  background: '#F8FAFC',
  // Elevated surface colour — cards, sheets, modals sit on this rather
  // than directly on `background`.
  surface: '#FFFFFF',
  // Hairline border/divider colour for cards, inputs, and separators.
  border: '#E2E8F0',
  // Primary/body text colour — highest-contrast text on `background`/`surface`.
  text: '#0F172A',
  // Secondary text colour — subtitles, metadata, less prominent copy.
  textSecondary: '#64748B',
  // Muted text colour — placeholders, disabled/inactive text, timestamps.
  textMuted: '#94A3B8',
  // Success state colour — confirmations, positive status badges (e.g. "Applied").
  success: '#10B981',
  // Error state colour — form validation errors, failed states, destructive actions.
  error: '#EF4444',
  // Warning state colour — cautionary banners/badges (shares the amber accent hue).
  warning: '#F59E0B',
  // Pure white — use for text/icons needing full contrast on coloured
  // (e.g. primary-filled) backgrounds.
  white: '#FFFFFF',
  // Pure black — reserved for cases needing true black (rare; prefer `text`).
  black: '#000000',
} as const;

// Dark-mode counterpart. Same token names/roles as LightColors (so every
// call site works unchanged regardless of which palette is active) —
// surfaces darken and invert, primary/success/error/warning are lifted a
// step lighter than their light-mode values to keep contrast on dark
// backgrounds, and white/black are deliberately left unchanged (they're
// used for text/icons that need to stay a fixed extreme against
// whichever coloured surface they sit on, e.g. white text on the
// primary-filled header, not for background/foreground roles).
export const DarkColors = {
  primary: '#3B82F6',
  primaryLight: '#1E3A5F',
  primaryDark: '#60A5FA',
  secondary: '#FBBF24',
  background: '#0B1220',
  surface: '#131B2E',
  border: '#25314A',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  success: '#34D399',
  error: '#F87171',
  warning: '#FBBF24',
  white: '#FFFFFF',
  black: '#000000',
} as const;

// Widened explicitly (each field typed as `string`, not the literal hex
// value) rather than `typeof LightColors` — `LightColors`/`DarkColors`
// are each declared `as const` for their own literal-type precision, but
// that means their literal types differ from each other (e.g. `primary`
// is the literal `"#1D4ED8"` on one and `"#3B82F6"` on the other), so
// neither palette would satisfy a type inferred from just one of them.
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
  white: string;
  black: string;
}

/**
 * Resolves the user's `themeStore` preference (light/dark/system) down
 * to an actual 'light' | 'dark' mode, with "system" following
 * `useColorScheme()` (the device's own light/dark setting).
 *
 * @returns 'light' or 'dark'. Re-renders the calling component whenever
 *   the resolved mode changes (preference update or, under "system", an
 *   OS theme change).
 * @remarks Shared by `useThemeColors()` below and `App.tsx`'s
 *   `<StatusBar>`, so both agree on the same resolved mode rather than
 *   `<StatusBar style="auto">` following the OS directly and silently
 *   disagreeing with an explicit Light/Dark preference.
 */
export function useResolvedTheme(): 'light' | 'dark' {
  const preference = useThemeStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const resolved = preference === 'system' ? systemScheme : preference;
  return resolved === 'dark' ? 'dark' : 'light';
}

/**
 * Resolves and returns the active colour palette (see `useResolvedTheme`
 * for how the mode itself is determined).
 *
 * @returns `LightColors` or `DarkColors`. Re-renders the calling
 *   component whenever the resolved palette changes.
 * @remarks This is the only supported way to read theme colours —
 *   see the file-level comment for why a static import can't be
 *   reactive the way this hook is.
 */
export function useThemeColors(): ThemeColors {
  return useResolvedTheme() === 'dark' ? DarkColors : LightColors;
}
