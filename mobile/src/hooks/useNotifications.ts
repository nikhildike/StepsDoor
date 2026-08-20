/**
 * hooks/useNotifications.ts
 *
 * Wires up the push-notification lifecycle for the app: once a user is
 * signed in, registers for FCM push notifications and subscribes to
 * foreground notification events (received + tapped/responded). Mounted
 * once at the app root via `App.tsx`'s `NotificationSetup` component —
 * not tied to any particular screen.
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotifications } from '@/services/notificationService';
import { useAuthStore } from '@/store/authStore';

/**
 * Registers the device for push notifications and listens for
 * notification events while a user is authenticated. Re-runs whenever
 * the auth `token` changes (e.g. on login/logout), and unsubscribes its
 * listeners on cleanup to avoid duplicate/stale handlers.
 *
 * @remarks Has no return value — it's a side-effect-only hook. Mounted
 *   once at the app root (`App.tsx`) so push registration and
 *   notification handling are active app-wide regardless of which screen
 *   is focused.
 */
export function useNotifications() {
  const { token } = useAuthStore();
  // Refs (rather than state) hold the listener subscriptions since they
  // don't need to trigger re-renders — they're only used for cleanup.
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Don't register for push / attach listeners until a user is signed
    // in — an anonymous session has no backend user to associate the
    // push token with.
    if (!token) return;

    // Push-token lifecycle: request permission, fetch the Expo/FCM push
    // token, and register it with the backend (see
    // `notificationService.registerForPushNotifications` for the full
    // permission → token → backend-registration flow).
    registerForPushNotifications();

    // Fires when a notification arrives while the app is in the
    // foreground (see the handler configured in `notificationService.ts`
    // that keeps foreground alerts visible).
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
      }
    );

    // Fires when the user taps/interacts with a notification (whether
    // the app was foregrounded, backgrounded, or launched from it).
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log('Notification response:', response);
        // TODO: Navigate to relevant screen based on notification data
      }
    );

    // Cleanup: remove both listeners when the token changes or the
    // component unmounts, preventing duplicate handlers from
    // accumulating across re-registrations.
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [token]);
}
