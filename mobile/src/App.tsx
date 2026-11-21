/**
 * App.tsx
 *
 * Root component of the StepsDoor mobile app. Wires together the
 * top-level providers (gesture handling, status bar) and mounts the
 * app-wide push-notification side effect alongside the root navigator,
 * which always lands the user on the main tabbed app (browsing is free —
 * no login gate) and only surfaces the auth flow on demand — see
 * `navigation/index.tsx`.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '@/navigation';
import { useNotifications } from '@/hooks/useNotifications';
import { useResolvedTheme } from '@/theme/colors';

// Renders nothing — exists purely to invoke `useNotifications` (which
// registers for push notifications and subscribes to notification
// events) as a side effect at the app root, so notification handling is
// active regardless of which screen is currently focused.
function NotificationSetup() {
  useNotifications();
  return null;
}

export default function App() {
  // Drives the status bar icon colour off the app's own resolved theme
  // (Settings > Theme preference, falling back to the OS setting under
  // "System") rather than `style="auto"`, which follows the OS directly
  // and would silently disagree with an explicit Light/Dark choice.
  const resolvedTheme = useResolvedTheme();

  return (
    // GestureHandlerRootView must wrap the app for react-native-gesture-handler
    // (used by React Navigation's gesture-based transitions/swipes) to work.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* SafeAreaProvider supplies the device's real safe-area insets to
          every `useSafeAreaInsets()`/`SafeAreaView` (from
          react-native-safe-area-context) call below it — required for
          `BurgerMenu`'s top bar and `ScreenWrapper` to size correctly. */}
      <SafeAreaProvider>
        {/* Dark icons on a light app theme, light icons on a dark one. */}
        <StatusBar style={resolvedTheme === 'dark' ? 'light' : 'dark'} />
        {/* Mounts push-notification registration/listeners app-wide. */}
        <NotificationSetup />
        {/* Always lands on the main tabbed app; the auth flow is a
            separately-reachable screen, not an entry gate — see RootNavigator. */}
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
