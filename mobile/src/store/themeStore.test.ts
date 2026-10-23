// Smoke test for themeStore — also verifies the jest-expo setup (preset, AsyncStorage
// mock) is wired correctly for the rest of the test suite.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeStore } from './themeStore';

describe('useThemeStore', () => {
  afterEach(async () => {
    await AsyncStorage.clear();
    useThemeStore.setState({ theme: 'system' });
  });

  it('defaults to system', () => {
    expect(useThemeStore.getState().theme).toBe('system');
  });

  it('setTheme updates in-memory state and persists to AsyncStorage', async () => {
    await useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(await AsyncStorage.getItem('theme_preference')).toBe('dark');
  });

  it('loadFromStorage rehydrates a previously persisted preference', async () => {
    await AsyncStorage.setItem('theme_preference', 'light');
    await useThemeStore.getState().loadFromStorage();
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('loadFromStorage ignores an unset/invalid value and keeps the default', async () => {
    await useThemeStore.getState().loadFromStorage();
    expect(useThemeStore.getState().theme).toBe('system');
  });
});
