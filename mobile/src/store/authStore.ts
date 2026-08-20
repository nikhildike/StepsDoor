/**
 * store/authStore.ts
 *
 * Zustand store holding the signed-in job seeker's auth state (user
 * profile + JWT access/refresh tokens). Unlike the web app's
 * `authStore.js` (which persists via zustand's `persist` middleware to
 * localStorage), this store persists the tokens manually to
 * `AsyncStorage` — React Native's async, persistent key/value store —
 * since there is no `localStorage` on-device. Note the user object itself
 * is NOT persisted to AsyncStorage, only the tokens are; `user` is
 * expected to be re-populated in memory (e.g. via `authService.me()` or
 * on login/register) each app session.
 *
 * Consumed by `hooks/useAuth.ts`, which wraps these actions for the auth
 * screens, and by `hooks/useNotifications.ts`/`api.ts`'s interceptors
 * which read the persisted tokens.
 */
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Shape of the authenticated user's profile as returned by the backend's
// auth endpoints (`authService.login`/`register`/`me`).
interface User {
  id: number;
  email: string;
  username: string;
  is_company: boolean;
  is_job_seeker: boolean;
}

interface AuthState {
  /** Currently signed-in user's profile, or null when logged out / not yet loaded. Not persisted to AsyncStorage — held in memory only. */
  user: User | null;
  /** Current JWT access token used to authenticate API requests (attached by `api.ts`'s request interceptor). Persisted to AsyncStorage under the `access_token` key. */
  token: string | null;
  /** JWT refresh token used by `api.ts`'s response interceptor to silently obtain a new access token when it expires. Persisted to AsyncStorage under the `refresh_token` key. */
  refreshToken: string | null;
  /** Persists both tokens to AsyncStorage and updates in-memory state after a successful login/register. */
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>;
  /** Clears both tokens from AsyncStorage and resets in-memory state, signing the user out. */
  logout: () => Promise<void>;
  /** Updates the in-memory user profile only (no AsyncStorage write) — for refreshing profile data without touching tokens. */
  setUser: (user: User) => void;
  /** Rehydrates `token`/`refreshToken` from AsyncStorage into memory — call on app startup so a previously signed-in user stays logged in across app restarts. */
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state — nothing is known until `loadFromStorage` runs (or a
  // fresh login/register happens) since AsyncStorage reads are async and
  // can't be awaited during store creation.
  user: null,
  token: null,
  refreshToken: null,

  // Action: called after a successful login/register. Writes both tokens
  // to AsyncStorage (multiSet batches the two writes into one native
  // call) before updating in-memory state, so a later `loadFromStorage`
  // call (e.g. after an app restart) can recover this session.
  setAuth: async (user, token, refreshToken) => {
    await AsyncStorage.multiSet([
      ['access_token', token],
      ['refresh_token', refreshToken],
    ]);
    set({ user, token, refreshToken });
  },

  // Action: signs the user out. Removes both persisted tokens from
  // AsyncStorage and clears in-memory state, causing RootNavigator to
  // switch back to AuthNavigator.
  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    set({ user: null, token: null, refreshToken: null });
  },

  // Action: updates only the in-memory `user` field (e.g. after
  // refetching the profile via `authService.me()`). Does not touch
  // AsyncStorage since tokens are unaffected.
  setUser: (user) => set({ user }),

  // Action: reads the persisted tokens back out of AsyncStorage into
  // memory. Intended to run once on app startup (e.g. from a
  // SplashScreen) so a returning user with valid stored tokens is treated
  // as still logged in without re-entering credentials.
  loadFromStorage: async () => {
    const [[, token], [, refreshToken]] = await AsyncStorage.multiGet([
      'access_token',
      'refresh_token',
    ]);
    if (token) set({ token, refreshToken });
  },
}));
