/**
 * Shared Axios instance for the StepsDoor web frontend.
 *
 * This is the single HTTP client every other file under `frontend/src/services/`
 * imports and builds on (`import api from './api'`). It centralizes:
 *   - the API base URL and default headers,
 *   - attaching the JWT access token to outgoing requests, and
 *   - transparently refreshing an expired access token on a 401 response and
 *     retrying the original request once.
 *
 * A near-identical copy of this file lives in `mobile/src/services/api.ts` for
 * the Expo app (job seekers only) — same interceptor logic, but it reads/writes
 * tokens via AsyncStorage instead of `localStorage` and points at
 * `10.0.2.2:8000` for the Android emulator. Keep behavior in sync when editing
 * either copy.
 */
import axios from 'axios'
import { API_URL } from '@/utils/constants'

// Base Axios instance used for all authenticated/unauthenticated API calls.
// `baseURL` is prefixed to every relative path passed to api.get/post/etc.
// (e.g. api.get('/jobs/') hits `${API_URL}/jobs/`). JSON is the default
// content type; individual calls (e.g. file uploads) override this per-request.
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// --- Request interceptor -------------------------------------------------
// Runs before every outgoing request made with this `api` instance.
// Reads the current JWT access token out of localStorage (written by
// authStore.setAuth) and, if present, attaches it as a Bearer token so the
// Django REST backend can authenticate the caller. Requests made while
// logged out simply go out without an Authorization header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// --- Response interceptor: auto-refresh on 401 ---------------------------
// Runs after every response (success or error) received on this `api`
// instance. On success it's a no-op passthrough. On failure it implements a
// one-shot "refresh the access token, then replay the original request" flow:
//
//   1. Only 401 Unauthorized responses are handled here (expired/invalid
//      access token); every other status is rejected as-is.
//   2. `original._retry` is a flag stamped onto the *original* request config
//      the first time we attempt a refresh for it. This guards against an
//      infinite loop: if the retried request also comes back 401 (e.g. the
//      refresh token itself is invalid, or refresh "succeeded" but the new
//      token still isn't accepted), the `!original._retry` check fails on the
//      second pass and the error is simply propagated instead of retrying
//      forever.
//   3. The refresh token is read from localStorage and POSTed to
//      `/auth/refresh/` using a *plain* `axios.post` (not the `api` instance)
//      so this call doesn't itself get intercepted/retried and recurse.
//   4. On success, the new access token is persisted to localStorage, the
//      original request's Authorization header is updated in place, and the
//      original request is re-issued via `api(original)` — this returns the
//      retried request's promise to the original caller, so from the
//      caller's point of view the first call just "took a little longer".
//   5. On failure (refresh token missing/expired/rejected by the backend),
//      both tokens are cleared from localStorage and the user is hard
//      redirected to `/login` — there is no in-app state cleanup here (e.g.
//      authStore isn't explicitly cleared), the redirect effectively resets
//      the app.
//   6. Note: this is not mutex-guarded — if multiple requests 401
//      simultaneously, each one independently triggers its own refresh call
//      (no shared in-flight promise), so concurrent 401s can result in
//      multiple parallel refresh requests rather than a single shared one.
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refresh = localStorage.getItem('refresh_token')
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh })
        localStorage.setItem('access_token', data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
