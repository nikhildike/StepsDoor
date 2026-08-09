import { useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';

export function useAuth() {
  const { user, token, setAuth, logout } = useAuthStore();

  const login = useCallback(async (credentials: { username: string; password: string }) => {
    const { data } = await authService.login(credentials);
    await setAuth(data.user, data.access, data.refresh);
    return data;
  }, [setAuth]);

  const register = useCallback(async (userData: object) => {
    const { data } = await authService.register(userData as any);
    await setAuth(data.user, data.access, data.refresh);
    return data;
  }, [setAuth]);

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
