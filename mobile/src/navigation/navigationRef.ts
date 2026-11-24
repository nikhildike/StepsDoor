/**
 * navigationRef.ts
 *
 * App-wide navigation ref, attached to the single `NavigationContainer` in
 * `navigation/index.tsx`. Lets code outside any screen navigate — used by
 * `hooks/useNotifications.ts` (mounted in `App.tsx`, above the container) to
 * open the right screen when the user taps a push notification.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

/** Ref to the root navigator; check `navigationRef.isReady()` before navigating. */
export const navigationRef = createNavigationContainerRef<any>();
