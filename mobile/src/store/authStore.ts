import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  email: string;
  username: string;
  is_company: boolean;
  is_job_seeker: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  setAuth: (user: User, token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,

  setAuth: async (user, token, refreshToken) => {
    await AsyncStorage.multiSet([
      ['access_token', token],
      ['refresh_token', refreshToken],
    ]);
    set({ user, token, refreshToken });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    set({ user: null, token: null, refreshToken: null });
  },

  setUser: (user) => set({ user }),

  loadFromStorage: async () => {
    const [[, token], [, refreshToken]] = await AsyncStorage.multiGet([
      'access_token',
      'refresh_token',
    ]);
    if (token) set({ token, refreshToken });
  },
}));
