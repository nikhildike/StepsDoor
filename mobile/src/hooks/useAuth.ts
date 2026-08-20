/**
 * hooks/useAuth.ts
 *
 * Screen-facing auth hook that combines `authService` (API calls) with
 * `authStore` (Zustand state + AsyncStorage persistence) into a simple
 * `login`/`register`/`signOut` interface. Used by the auth screens
 * (`screens/auth/Login`, `screens/auth/Register`) and by any
 * screen/component that needs to know the current user or auth status
 * (e.g. Profile screen, protected navigators).
 */
import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

/**
 * Provides the current auth state and actions to sign a job seeker in,
 * register a new account, or sign out.
 *
 * @returns `{ user, token, login, register, signOut, isAuthenticated }`
 *   — `user`/`token` mirror the auth store; `isAuthenticated` is a
 *   derived convenience boolean (`!!token`).
 * @remarks Used by Login/Register screens to perform auth actions, and by
 *   any screen needing to read `user`/`isAuthenticated` (e.g. Profile,
 *   navigators gating access to seeker-only screens).
 */
export function useAuth() {
  const { user, token, setAuth, logout } = useAuthStore();

  /**
   * Log the user in and persist the resulting tokens/profile via the
   * auth store (which writes tokens to AsyncStorage).
   * @param credentials - `{ username, password }`.
   * @returns The raw response `data` from `authService.login` (user + tokens).
   * @remarks Called from the Login screen's submit handler.
   */
  const login = useCallback(async (credentials: { username: string; password: string }) => {
    const { data } = await authService.login(credentials);
    await setAuth(data.user, data.access, data.refresh);
    return data;
  }, [setAuth]);

  /**
   * Register a new job-seeker account and persist the resulting
   * tokens/profile via the auth store (which writes tokens to AsyncStorage).
   * @param userData - Registration payload (username, email, password, etc.).
   * @returns The raw response `data` from `authService.register` (user + tokens).
   * @remarks Called from the Register screen's submit handler.
   */
  const register = useCallback(async (userData: object) => {
    const { data } = await authService.register(userData as any);
    await setAuth(data.user, data.access, data.refresh);
    return data;
  }, [setAuth]);

  /**
   * Sign the current user out, clearing tokens from both memory and
   * AsyncStorage via the auth store's `logout` action.
   * @remarks Called from Profile/settings screens' logout action.
   */
  const signOut = useCallback(async () => {
    await logout();
  }, [logout]);

  return {
    user,
    token,
    login,
    register,
    signOut,
    isAuthenticated: !!token,
  };
}
