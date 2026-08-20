/**
 * services/authService.ts
 *
 * Thin wrapper around the shared `api` Axios instance for the
 * authentication endpoints (login, register, current-user lookup).
 * Consumed by `hooks/useAuth.ts`, which drives the auth screens
 * (`screens/auth/Login`, `screens/auth/Register`) and syncs results into
 * `store/authStore.ts`. Mirrors `frontend/src/services/authService.js`.
 */
import api from './api';

export const authService = {
  /**
   * Log a user in with username/password.
   * @param credentials - `{ username, password }`.
   * @returns Axios response whose `data` contains the user object plus
   *   `access`/`refresh` JWT tokens (consumed by `useAuth().login`, which
   *   persists them via `authStore.setAuth`).
   * @remarks Used by the Login screen.
   */
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login/', credentials),
  /**
   * Register a new job-seeker account.
   * @param data - `{ username, email, password, is_job_seeker }`.
   * @returns Axios response whose `data` contains the created user plus
   *   `access`/`refresh` JWT tokens (consumed by `useAuth().register`).
   * @remarks Used by the Register screen.
   */
  register: (data: { username: string; email: string; password: string; is_job_seeker: boolean }) =>
    api.post('/auth/register/', data),
  /**
   * Fetch the currently authenticated user's profile from the backend
   * (uses the Bearer token attached by the `api` request interceptor).
   * @returns Axios response with the current user's data.
   * @remarks Available for screens/hooks that need to refresh/verify the
   *   signed-in user's profile (e.g. on app resume).
   */
  me: () => api.get('/auth/me/'),
};
