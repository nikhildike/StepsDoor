/**
 * SplashScreen.tsx
 *
 * App boot screen shown by `RootNavigator` before it mounts the real
 * navigation tree. Not part of any navigator itself — it renders standalone
 * while the stored auth token (if any) and theme preference are loaded
 * from AsyncStorage into `authStore`/`themeStore`, so a previously-signed-in
 * user's requests carry their token and their chosen theme is already
 * known from the very first screen, then reports completion via `onReady`.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';

interface Props {
  onReady: () => void;
}

/**
 * Renders the StepsDoor splash/logo screen while checking for a persisted
 * session. Reads no route params (rendered directly by `RootNavigator`, not
 * inside a stack); its only prop is the `onReady` callback (see `Props`)
 * which `RootNavigator` uses to know when to mount the real navigation tree.
 * Use case: brief branded loading screen that also performs the auth-token
 * bootstrap before any screen (which always lands on the tabbed app, auth
 * gate or not) can make an authenticated request.
 */
export function SplashScreen({ onReady }: Props) {
  // loadFromStorage reads the persisted token/user from AsyncStorage into
  // the auth store, so it's available before any screen mounts.
  const { loadFromStorage } = useAuthStore();
  // Rehydrates the persisted theme preference (see store/themeStore.ts).
  const loadTheme = useThemeStore((s) => s.loadFromStorage);
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // On mount: hydrate auth + theme state from AsyncStorage in parallel,
  // then, after a short delay (to let the splash branding show), tell
  // RootNavigator hydration is done so it can mount the real navigation tree.
  useEffect(() => {
    Promise.all([loadFromStorage(), loadTheme()]).then(() => {
      setTimeout(onReady, 800);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>StepsDoor</Text>
      <Text style={styles.tagline}>Jobs & Tenders in India</Text>
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.white },
  tagline: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
