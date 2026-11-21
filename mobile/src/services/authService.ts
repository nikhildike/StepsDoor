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
   * Register a new job-seeker account. Requires `email_verified_token`
   * (obtained via `sendOtp` + `verifyOtp`) since the backend rejects
   * registration for an email that hasn't completed OTP verification.
   * @param data - `{ email, password, is_job_seeker, email_verified_token }`.
   * @returns Axios response whose `data` contains the created user plus
   *   `access`/`refresh` JWT tokens (consumed by `useAuth().register`).
   * @remarks Used by the Register screen, as the final step after OTP verification.
   */
  register: (data: { email: string; password: string; is_job_seeker: boolean; email_verified_token: string }) =>
    api.post('/auth/register/', data),
  /**
   * Requests a one-time password be emailed to the given address, as the
   * first step of the registration flow.
   * @param email - Address to verify.
   * @returns Axios response (no meaningful body beyond a status message).
   * @remarks Used by the Register screen before showing the OTP step.
   */
  sendOtp: (email: string) => api.post('/auth/send-otp/', { email }),
  /**
   * Verifies a previously emailed OTP code.
   * @param email - Address the OTP was sent to.
   * @param otp - The 6-digit code entered by the user.
   * @returns Axios response whose `data.verified_token` is a signed token
   *   proving the email was verified; passed as `email_verified_token` to `register`.
   * @remarks Used by the Register screen's OTP step, right before calling `register`.
   */
  verifyOtp: (email: string, otp: string) => api.post('/auth/verify-otp/', { email, otp }),
  /**
   * Fetch the currently authenticated user's profile from the backend
   * (uses the Bearer token attached by the `api` request interceptor).
   * @returns Axios response with the current user's data.
   * @remarks Available for screens/hooks that need to refresh/verify the
   *   signed-in user's profile (e.g. on app resume).
   */
  me: () => api.get('/auth/me/'),
  /**
   * Changes the signed-in user's password. Shared across every account role
   * since they all hit the same backend endpoint.
   * @param data - `{ old_password, new_password }`.
   * @returns Axios response (success detail message).
   * @remarks Used by the Settings screen's Change Password section.
   */
  changePassword: (data: { old_password: string; new_password: string }) =>
    api.post('/auth/change-password/', data),
};
