/**
 * services/api.ts
 *
 * Shared Axios instance for all StepsDoor mobile API calls (auth, jobs,
 * tenders, govt jobs, notifications, etc.). Every other file under
 * `services/` imports this instance rather than calling `axios` directly,
 * so the base URL, default headers, and auth/token-refresh behaviour stay
 * consistent app-wide.
 *
 * This mirrors `frontend/src/services/api.js` from the web app (same JWT
 * login + auto-refresh-on-401 flow), with the one platform-specific
 * difference being the base URL below, since a mobile emulator does not
 * share "localhost" with the host machine the way a browser dev server does.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// The Android emulator runs in its own virtual network, so `localhost`
// inside the emulator refers to the emulator itself, not the host machine
// running the Django dev server. The emulator's virtual router reserves
// 10.0.2.2 as an alias for the host machine's loopback interface, so that
// address (not 127.0.0.1/localhost) is what reaches `manage.py runserver`
// on the developer's PC. iOS simulators do not have this problem (they
// share the host's network stack), but this app currently targets the
// Android emulator only.
const API_URL = 'http://10.0.2.2:8000/api'; // Android emulator → localhost
// For physical device: replace with your machine's LAN IP e.g. http://192.168.1.x:8000/api

// Single shared Axios instance, configured once and reused everywhere.
// - baseURL: prefixes every request made through `api` with API_URL, so
//   call sites only need to pass the path (e.g. `/jobs/`).
// - headers: default to JSON for all requests/responses.
// - timeout: aborts requests that take longer than 15s (avoids requests
//   hanging indefinitely on a flaky mobile connection).
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor: runs before every outgoing request. Reads the
// current JWT access token from AsyncStorage (React Native's persistent
// key/value store, the mobile equivalent of localStorage) and, if present,
// attaches it as a Bearer token so protected endpoints authenticate the
// user automatically without every call site having to do this itself.
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: implements silent access-token refresh on 401s.
// - On any successful response, pass it through unchanged.
// - On an error response, only attempt a refresh if the failure was a 401
//   (Unauthorized, i.e. the access token expired) and this particular
//   request hasn't already been retried (the `_retry` flag prevents an
//   infinite refresh loop if the refresh itself keeps failing).
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Use the raw `axios` (not the `api` instance) for the refresh
        // call so it isn't subject to this same interceptor and doesn't
        // recurse. Exchange the stored refresh token for a new access
        // token, persist it, then retry the original failed request once
        // with the new token attached.
        const refresh = await AsyncStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
        await AsyncStorage.setItem('access_token', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        // Refresh token is invalid/expired too — clear stored credentials
        // so the app falls back to its logged-out state (AuthNavigator).
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
