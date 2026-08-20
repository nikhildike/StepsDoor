/**
 * services/notificationService.ts
 *
 * Handles push-notification setup and FCM (Firebase Cloud Messaging)
 * token registration — the mobile-only counterpart to web's browser
 * notifications, since job seekers receive alert/job-match pushes here.
 * Consumed by `hooks/useNotifications.ts`, which is wired up once at the
 * app root (`App.tsx`'s `NotificationSetup`).
 *
 * End-to-end FCM registration flow:
 *   1. Check whether the app already has notification permission
 *      (`getPermissionsAsync`); if not, prompt the OS permission dialog
 *      (`requestPermissionsAsync`).
 *   2. If permission is granted, ask Expo for a push token
 *      (`getExpoPushTokenAsync`) — under the hood, on Android this token
 *      is backed by Firebase Cloud Messaging (per `theme`/infra docs:
 *      "Push Notifications: Firebase FCM via expo-notifications").
 *   3. Send that token to the Django backend (`POST /auth/fcm-token/`) so
 *      server-side Celery tasks (e.g. alert matching in `alerts`/`tenders`/
 *      `govtjobs` apps) can target this device when dispatching pushes.
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import api from './api';

// Configures how notifications are presented while the app is in the
// foreground. Without this handler, Expo suppresses foreground alerts by
// default; StepsDoor wants them to still show a banner/sound/badge like
// the app were backgrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permission (if not already granted), retrieve this
 * device's Expo/FCM push token, and register it with the backend so the
 * signed-in user can receive job/tender/govt-job alert pushes.
 *
 * @returns The push token string on success, or `null` if running on a
 *   simulator/emulator without push support, or if the user denies
 *   permission.
 * @remarks Called from `hooks/useNotifications.ts` once a user is
 *   authenticated (i.e. from the app root via `App.tsx`'s
 *   `NotificationSetup`). Not tied to any single screen.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications require a physical device — simulators/emulators
  // don't have a real push service connection, so bail out early.
  if (!Device.isDevice) return null;

  // Step 1: check existing permission before prompting, so a user who
  // already granted (or permanently denied) it isn't asked again
  // needlessly.
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    // Triggers the native OS permission dialog.
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // User declined (or previously denied) permission — nothing more to do.
  if (finalStatus !== 'granted') return null;

  // Step 2: obtain the Expo push token for this device/app install. Expo
  // relays this via FCM on Android under the hood.
  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Step 3: register token with backend so it can target this device for
  // alert/job-match push notifications.
  try {
    await api.post('/auth/fcm-token/', { token });
  } catch {
    // Non-critical — don't block app startup
  }

  return token;
}
