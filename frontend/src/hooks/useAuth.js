import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'

export function useAuth() {
  const { user, token, setAuth, logout, setUser } = useAuthStore()
  const navigate = useNavigate()

  const redirectAfterAuth = useCallback((user) => {
    if (user.is_store_owner) navigate('/store')
    else if (user.is_company) navigate('/dashboard')
    else navigate('/seeker')
  }, [navigate])

  const login = useCallback(async (credentials) => {
    const { data } = await authService.login(credentials)
    setAuth(data.user, data.access, data.refresh)
    redirectAfterAuth(data.user)
  }, [setAuth, redirectAfterAuth])

  const register = useCallback(async (userData) => {
    const { data } = await authService.register(userData)
    setAuth(data.user, data.access, data.refresh)
    redirectAfterAuth(data.user)
  }, [setAuth, redirectAfterAuth])

  const signOut = useCallback(() => {
    logout()
    navigate('/login')
  }, [logout, navigate])

  return { user, token, login, register, signOut, isAuthenticated: !!token }
}
