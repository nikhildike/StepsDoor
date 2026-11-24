/**
 * services/notificationService.ts
 *
 * Push-notification setup and device registration (expo-notifications, SDK 57).
 * Consumed by `hooks/useNotifications.ts` (registration on sign-in, tap
 * handling) and `hooks/useAuth.ts` (unregistering on sign-out).
 *
 * Flow — the backend sends alert digests through Expo's push service
 * (backend/apps/notifications/push.py), so the app registers an *Expo* push
 * token, not a raw FCM token:
 *   1. Android: create the "default" notification channel. Must happen before
 *      asking for a token, or the Android 13+ permission prompt never appears;
 *      the backend sends with `channelId: 'default'`.
 *   2. Check / request notification permission.
 *   3. `getExpoPushTokenAsync({ projectId })` — projectId comes from app config
 *      (`extra.eas.projectId`, written by `eas init`); without it the call
 *      rejects, so registration is skipped with a warning.
 *   4. POST the token to /api/notifications/push-token/ and remember it, so
 *      sign-out can DELETE it.
 *
 * Remote push doesn't work in Expo Go on Android (since SDK 53) — it needs a
 * development or production build. On simulators/emulators registration is
 * skipped (`Device.isDevice`).
 */
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// AsyncStorage key for the token this device registered, so sign-out can unregister it.
const PUSH_TOKEN_KEY = 'push_token';
// Android channel id; must match `channelId` in backend/apps/notifications/push.py.
export const DEFAULT_CHANNEL_ID = 'default';

// Show notifications that arrive while the app is open (Expo hides them by default).
// shouldShowAlert is deprecated in SDK 57 — banner/list replace it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Creates the Android "default" channel (no-op elsewhere); must run before requesting a token. */
export async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
    name: 'Alerts',
    description: 'New tenders and jobs matching your alerts',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** The EAS project id from app config, or undefined until `eas init` has been run. */
function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Registers this device for alert push notifications and returns its Expo push
 * token, or null when that isn't possible (simulator, permission denied, no EAS
 * project id, offline). Safe to call on every sign-in/app start — the backend
 * endpoint is idempotent. Failures are logged, never thrown: push is optional.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    await ensureAndroidChannel();

    const { status: existing } = await Notifications.getPermissionsAsync();
    const status = existing === 'granted' ? existing : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;

    const id = projectId();
    if (!id) {
      console.warn('Push notifications disabled: no EAS projectId in app config (run `eas init` in mobile/).');
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;

    await api.post('/notifications/push-token/', { token });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    // Usually offline or the backend is unreachable; the next sign-in/app start retries.
    console.warn('Push notification registration failed:', error);
    return null;
  }
}

/**
 * Unregisters this device so the signed-out account stops getting pushes here.
 * Must run while the auth token is still valid (before clearing it). Never throws —
 * sign-out shouldn't fail because of push.
 */
export async function unregisterPushNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
    await api.delete('/notifications/push-token/', { data: { token } });
  } catch (error) {
    console.warn('Push notification unregistration failed:', error);
  }
}
