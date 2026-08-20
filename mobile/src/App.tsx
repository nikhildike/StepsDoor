/**
 * App.tsx
 *
 * Root component of the StepsDoor mobile app. Wires together the
 * top-level providers (gesture handling, status bar) and mounts the
 * app-wide push-notification side effect alongside the root navigator,
 * which itself decides (based on persisted auth state) whether to show
 * the auth flow or the main tabbed app — see `navigation/RootNavigator`.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/navigation';
import { useNotifications } from '@/hooks/useNotifications';

// Renders nothing — exists purely to invoke `useNotifications` (which
// registers for push notifications and subscribes to notification
// events) as a side effect at the app root, so notification handling is
// active regardless of which screen is currently focused.
function NotificationSetup() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    // GestureHandlerRootView must wrap the app for react-native-gesture-handler
    // (used by React Navigation's gesture-based transitions/swipes) to work.
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Status bar style adapts automatically to the OS theme (light/dark). */}
      <StatusBar style="auto" />
      {/* Mounts push-notification registration/listeners app-wide. */}
      <NotificationSetup />
      {/* Decides between the auth flow and the main tabbed app based on
          stored auth state (loaded via authStore on a splash screen). */}
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
