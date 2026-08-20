/**
 * API domain: Authentication (`backend/apps/authentication`) — login,
 * registration, OTP verification, current-user lookup, and JWT refresh.
 * Built on the shared `api` Axios instance (see `./api.js`); results here
 * are typically fed into `store/authStore.js` (`setAuth`/`setUser`) to
 * persist the session. Mirrored in `mobile/src/services/authService.ts` for
 * the Expo app's Login/Register screens.
 */
import api from './api'

export const authService = {
  /**
   * Logs a user in with email/username + password.
   *
   * Endpoint: POST /auth/login/
   * @param {Object} credentials - e.g. { email, password }.
   * @returns {Promise} Axios response promise resolving to { access, refresh, user } (or similar).
   * Used by: `pages/public/Login.jsx`.
   */
  login: (credentials) => api.post('/auth/login/', credentials),

  /**
   * Registers a new account (job seeker or company).
   *
   * Endpoint: POST /auth/register/
   * @param {Object} data - Registration form fields.
   * @returns {Promise} Axios response promise resolving to the created user/session data.
   * Used by: `pages/public/Register.jsx`.
   */
  register: (data) => api.post('/auth/register/', data),

  /**
   * Requests a one-time password be sent to the given email (e.g. for
   * email verification or passwordless flows).
   *
   * Endpoint: POST /auth/send-otp/
   * @param {string} email
   * @returns {Promise} Axios response promise.
   * Used by: `pages/public/Register.jsx` / `Login.jsx` OTP step.
   */
  sendOtp: (email) => api.post('/auth/send-otp/', { email }),

  /**
   * Verifies an OTP code previously sent to `email`.
   *
   * Endpoint: POST /auth/verify-otp/
   * @param {string} email
   * @param {string} otp
   * @returns {Promise} Axios response promise.
   * Used by: `pages/public/Register.jsx` / `Login.jsx` OTP step.
   */
  verifyOtp: (email, otp) => api.post('/auth/verify-otp/', { email, otp }),

  /**
   * Fetches the currently authenticated user's profile (based on the
   * Bearer token attached by the request interceptor in `./api.js`).
   *
   * Endpoint: GET /auth/me/
   * @returns {Promise} Axios response promise resolving to the current User.
   * Used by: app bootstrap / `ProtectedRoute` to hydrate `authStore.user`.
   */
  me: () => api.get('/auth/me/'),

  /**
   * Exchanges a refresh token for a new access token.
   *
   * Endpoint: POST /auth/refresh/
   * @param {string} refresh - The refresh token.
   * @returns {Promise} Axios response promise resolving to { access }.
   * Note: the 401 auto-refresh interceptor in `./api.js` calls this same
   * backend endpoint directly via a plain `axios.post` rather than through
   * this helper (to avoid re-entering the interceptor); this export exists
   * for any explicit/manual refresh call sites.
   */
  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
}
