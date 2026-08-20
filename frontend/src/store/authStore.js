/**
 * State slice: Authentication — the current user, JWT access/refresh tokens,
 * and the actions that establish/tear down a session. Backed by
 * `services/authService.js` for the network calls that produce this data,
 * and read by `services/api.js`'s request interceptor indirectly (that
 * interceptor reads the token straight from `localStorage`, kept in sync
 * here — see the `setAuth`/`logout` comments below). A parallel
 * `mobile/src/store/authStore.ts` exists for the Expo app, using
 * AsyncStorage instead of `localStorage`/`zustand/persist`'s default web
 * storage.
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      // The logged-in user's profile object (from authService.me()/login()),
      // or null when logged out / not yet hydrated. Read by ProtectedRoute
      // and any component needing the current user's identity/role.
      user: null,
      // Current JWT access token. Initial value is null (logged out).
      // Note: `services/api.js`'s request interceptor does NOT read this
      // store's `token` directly — it reads `localStorage.getItem('access_token')`
      // instead, so `setAuth`/`logout` below must keep both in sync.
      token: null,
      // Current JWT refresh token, used to obtain a new access token when
      // the access token expires. Initial value is null (logged out).
      refreshToken: null,
      /**
       * Establishes a session: writes both tokens to localStorage (the
       * source of truth read by the Axios request interceptor in
       * `services/api.js`) and updates in-memory store state so React
       * components re-render with the new user/tokens.
       * Side effects: localStorage['access_token'], localStorage['refresh_token'].
       * Called by: `pages/public/Login.jsx` and `pages/public/Register.jsx`
       * after a successful `authService.login`/`register` call.
       */
      setAuth: (user, token, refreshToken) => {
        localStorage.setItem('access_token', token)
        localStorage.setItem('refresh_token', refreshToken)
        set({ user, token, refreshToken })
      },
      /**
       * Tears down the session: clears both tokens from localStorage and
       * resets user/token/refreshToken to null. Does not itself navigate;
       * callers (or the 401-refresh-failure path in `services/api.js`,
       * which clears localStorage directly rather than calling this action)
       * are responsible for redirecting to `/login` if needed.
       * Side effects: removes localStorage['access_token'], localStorage['refresh_token'].
       * Called by: logout buttons/menu items in the app header/nav.
       */
      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, token: null, refreshToken: null })
      },
      /**
       * Replaces just the `user` object in state (e.g. after fetching
       * updated profile data) without touching tokens.
       * Called by: profile pages after a successful profile update, or
       * app bootstrap after `authService.me()`.
       */
      setUser: (user) => set({ user }),
    }),
    // zustand/persist config: persists this store to localStorage under the
    // key 'auth-storage' so the session survives a page refresh. `partialize`
    // limits what's persisted to user/token/refreshToken (excludes any
    // future transient/derived state from being serialized). Note this is a
    // *second*, separate persistence path from the raw
    // localStorage['access_token']/['refresh_token'] keys written in
    // setAuth/logout above — those are read directly by the Axios
    // interceptor in `services/api.js`, while this `auth-storage` entry is
    // zustand's own rehydration mechanism for restoring `user`/`token`/
    // `refreshToken` into the store on app load.
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token, refreshToken: s.refreshToken }) }
  )
)
