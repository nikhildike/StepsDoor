/**
 * hooks/useNotifications.ts
 *
 * Push-notification lifecycle for the whole app, mounted once via `App.tsx`'s
 * `NotificationSetup` (above the NavigationContainer, so it navigates through
 * `navigationRef`):
 *   - once a user is signed in, registers the device for alert pushes
 *     (`notificationService.registerForPushNotifications`);
 *   - when the user taps a notification — while the app is open, in the
 *     background, or when the tap launched it from closed — opens the screen
 *     its data points at (`notificationRouting.routeForNotification`).
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/services/notificationService';
import { routeForNotification } from '@/services/notificationRouting';
import { navigationRef } from '@/navigation/navigationRef';
import { useAuthStore } from '@/store/authStore';

/**
 * Opens the screen for a tapped notification. Only plain taps count (not action
 * buttons); waits briefly if the navigator isn't mounted yet (cold start, while
 * the splash screen loads the session).
 */
function openFromResponse(response: Notifications.NotificationResponse, attempt = 0) {
  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
  const route = routeForNotification(response.notification.request.content.data as Record<string, unknown>);
  if (!route) return;
  if (!navigationRef.isReady()) {
    if (attempt < 20) setTimeout(() => openFromResponse(response, attempt + 1), 250); // up to ~5 s
    return;
  }
  navigationRef.navigate(route.name, route.params);
}

/**
 * Side-effect-only hook: registers for push while signed in (re-runs on sign-in /
 * account switch via the auth `token`), and handles notification taps app-wide.
 */
export function useNotifications() {
  const { token } = useAuthStore();

  // Register this device for the signed-in user. Guests have no account to notify.
  useEffect(() => {
    if (token) registerForPushNotifications();
  }, [token]);

  // Taps: one launched the app from closed (handled once, then cleared so it isn't
  // replayed), and any tap while the app is running or in the background.
  useEffect(() => {
    let cancelled = false;
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (cancelled || !response) return;
      openFromResponse(response);
      Notifications.clearLastNotificationResponseAsync();
    });
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => openFromResponse(response));
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
