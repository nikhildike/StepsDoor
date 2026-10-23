/**
 * store/themeStore.ts
 *
 * Zustand store holding the user's theme preference (light/dark/system),
 * persisted to AsyncStorage so it survives app restarts. Set from
 * `SettingsScreen`'s Theme picker.
 *
 * Scope note: this currently only stores the *preference*. The app's
 * screens still render from the static, light-only palette in
 * `theme/colors.ts` — wiring every screen's colors to actually repaint
 * for dark mode is a separate, larger effort. This store is the
 * settings UI's source of truth today, and is what that follow-up would
 * read from.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme_preference';

interface ThemeState {
  /** Current theme preference; defaults to 'system' until `loadFromStorage` resolves. */
  theme: ThemePreference;
  /** Persists the new preference to AsyncStorage and updates in-memory state. */
  setTheme: (theme: ThemePreference) => Promise<void>;
  /** Rehydrates the preference from AsyncStorage — call once on app startup (see `SplashScreen`). */
  loadFromStorage: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',

  // Action: called when the user picks a theme option in SettingsScreen.
  setTheme: async (theme) => {
    await AsyncStorage.setItem(STORAGE_KEY, theme);
    set({ theme });
  },

  // Action: reads the persisted preference back out of AsyncStorage into
  // memory. Intended to run once on app startup so a previously-chosen
  // preference survives an app restart.
  loadFromStorage: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      set({ theme: stored });
    }
  },
}));
