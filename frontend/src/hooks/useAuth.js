/**
 * useAuth.js — Authentication hook: login, register, sign-out, and
 * role-based post-auth redirection.
 *
 * Wraps `authService` (API calls) and `authStore` (Zustand, persisted to
 * localStorage) to provide a single hook for auth actions plus the
 * current user/token state. Used by Login and Register pages, and by
 * any header/nav component that needs `isAuthenticated`/`signOut`.
 */
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'

/**
 * Provides authentication state and actions for the current session.
 *
 * @returns {{
 *   user: object|null,
 *   token: string|null,
 *   login: (credentials: {email: string, password: string}) => Promise<void>,
 *   register: (userData: object) => Promise<void>,
 *   signOut: () => void,
 *   isAuthenticated: boolean
 * }} Auth state and action callbacks.
 * Used by: pages/public/Login, pages/public/Register, layout/nav
 * components that show sign-in state or a sign-out control.
 */
export function useAuth() {
  const { user, token, setAuth, logout, setUser } = useAuthStore()
  const navigate = useNavigate()

  // Routes the user to the correct home surface based on account type:
  // store owners -> /store, company accounts -> /dashboard, otherwise
  // treat as a job seeker -> /seeker. Order matters: store owners are
  // also flagged is_company, so this check must run before the company check.
  const redirectAfterAuth = useCallback((user) => {
    if (user.is_store_owner) navigate('/store')
    else if (user.is_company) navigate('/dashboard')
    else navigate('/seeker')
  }, [navigate])

  /**
   * Logs in with email/password credentials, persists the returned user
   * and JWT access/refresh tokens to the auth store, then redirects to
   * the appropriate home surface for the account type.
   * @param {{email: string, password: string}} credentials
   * @returns {Promise<void>}
   */
  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials)
    setAuth(data.user, data.access, data.refresh)
    redirectAfterAuth(data.user)
  }, [setAuth, redirectAfterAuth])

  /**
   * Registers a new account, persists the returned user and JWT tokens
   * to the auth store, then redirects to the appropriate home surface.
   * @param {object} userData - Registration form payload.
   * @returns {Promise<void>}
   */
  const register = useCallback(async (userData) => {
    const { data } = await authService.register(userData)
    setAuth(data.user, data.access, data.refresh)
    redirectAfterAuth(data.user)
  }, [setAuth, redirectAfterAuth])

  /**
   * Clears auth state (logs out of the store, which also clears
   * localStorage) and navigates to the login page.
   * @returns {void}
   */
  const signOut = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return { user, token, login, register, signOut, isAuthenticated: !!token }
}
