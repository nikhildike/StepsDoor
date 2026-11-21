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
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// None of the dev targets this app runs on share "localhost" with the host
// machine running the Django dev server (or, for web, they do — just not
// via `expo-constants`), so the API host has to be derived per-platform:
// - Web (`npm run web` / pressing `w`): runs as a normal page in the
//   browser on the dev machine, so `window.location.hostname` (the same
//   host:port the page itself was loaded from) is exactly right. Note
//   `Constants.expoConfig?.hostUri` is NEVER populated on web — it only
//   comes from `@expo/cli`'s native manifest — so relying on it here would
//   silently target the wrong host on every web request.
// - Android emulator (launched via `adb`, no LAN involved): the emulator's
//   virtual router reserves 10.0.2.2 as an alias for the host machine's
//   loopback interface.
// - Physical device via Expo Go (scanning the QR code over LAN/tunnel):
//   Metro's `hostUri` (e.g. "192.168.1.42:8081") already contains the exact
//   LAN IP the device used to reach the dev machine, so reusing that host
//   for the Django port (8000) reaches the same machine reliably without
//   hardcoding a specific IP that changes with every network.
function resolveApiHost(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  }
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "192.168.1.42:8081" or "localhost:8081"
  const host = hostUri?.split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return host; // physical device over LAN/tunnel — reuse Metro's LAN IP
  }
  return '10.0.2.2'; // emulator (or hostUri unavailable) — alias for the host machine
}

const API_URL = `http://${resolveApiHost()}:8000/api`;

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
        // so the app falls back to its logged-out state (guest browsing).
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
