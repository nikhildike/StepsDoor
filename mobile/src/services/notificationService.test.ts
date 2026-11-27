// Push notifications: tap routing, device registration/unregistration, and
// cold-start tap handling. expo-notifications/device/constants and the API
// client are mocked — nothing talks to a device, Expo or the backend.
import { renderHook, waitFor } from '@testing-library/react-native';

// jest.mock factories are hoisted above imports, so each mock is built inside its
// factory and fetched back with jest.requireMock below.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[abc]' })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  clearLastNotificationResponseAsync: jest.fn(() => Promise.resolve()),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  AndroidImportance: { HIGH: 4 },
  DEFAULT_ACTION_IDENTIFIER: 'expo.modules.notifications.actions.DEFAULT',
}));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));
jest.mock('./api', () => ({
  __esModule: true,
  default: { post: jest.fn(() => Promise.resolve({})), delete: jest.fn(() => Promise.resolve({})) },
}));
jest.mock('@/navigation/navigationRef', () => ({ navigationRef: { isReady: () => true, navigate: jest.fn() } }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { routeForNotification } from './notificationRouting';
import { registerForPushNotifications, unregisterPushNotifications } from './notificationService';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuthStore } from '@/store/authStore';

const mockNotifications = jest.requireMock('expo-notifications') as any;
const mockConstants = jest.requireMock('expo-constants').default as any;
const mockApi = jest.requireMock('./api').default as any;
const mockNavigate = jest.requireMock('@/navigation/navigationRef').navigationRef.navigate as jest.Mock;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  mockConstants.expoConfig = { extra: { eas: { projectId: 'proj-123' } } };
});

describe('routeForNotification', () => {
  it('opens a single listing directly and the list for several', () => {
    expect(routeForNotification({ type: 'alert_digest', kind: 'tender', count: 1, id: 7 })).toEqual({
      name: 'App', params: { screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: 7 } } },
    });
    expect(routeForNotification({ type: 'alert_digest', kind: 'tender', count: 3, id: null })).toEqual({
      name: 'App', params: { screen: 'Tenders', params: { screen: 'TendersList' } },
    });
    expect(routeForNotification({ type: 'alert_digest', kind: 'govt_job', count: 1, id: 4 })?.params).toEqual({
      screen: 'Jobs', params: { screen: 'GovtJobDetail', params: { jobId: 4 } },
    });
    expect(routeForNotification({ type: 'alert_digest', kind: 'govt_job', count: 2, id: null })?.params).toEqual({
      screen: 'Jobs', params: { screen: 'Home', params: { segment: 'govtJobs' } },
    });
    expect(routeForNotification({ type: 'alert_digest', kind: 'job', count: 1, id: 9 })?.params).toEqual({
      screen: 'Jobs', params: { screen: 'JobDetail', params: { jobId: 9 } },
    });
    // Several matches (or a single company careers job, which has no app screen) open Alerts.
    expect(routeForNotification({ type: 'alert_digest', kind: 'job', count: 4, id: null })).toEqual({ name: 'Alerts' });
  });

  it('ignores unknown payloads', () => {
    expect(routeForNotification(undefined)).toBeNull();
    expect(routeForNotification({ type: 'something_else' })).toBeNull();
    expect(routeForNotification({ type: 'alert_digest', kind: 'mystery' })).toBeNull();
  });
});

describe('registerForPushNotifications', () => {
  // Registration differs on Android (channel first); jest-expo defaults to iOS.
  const originalOS = Platform.OS;
  beforeAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' }));
  afterAll(() => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => originalOS }));

  it('creates the Android channel first, gets a token for the EAS project and registers it', async () => {
    await expect(registerForPushNotifications()).resolves.toBe('ExponentPushToken[abc]');
    const channelOrder = mockNotifications.setNotificationChannelAsync.mock.invocationCallOrder[0];
    const tokenOrder = mockNotifications.getExpoPushTokenAsync.mock.invocationCallOrder[0];
    expect(channelOrder).toBeLessThan(tokenOrder);
    expect(mockNotifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', expect.any(Object));
    expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'proj-123' });
    expect(mockApi.post).toHaveBeenCalledWith('/notifications/push-token/', { token: 'ExponentPushToken[abc]' });
    expect(await AsyncStorage.getItem('push_token')).toBe('ExponentPushToken[abc]');
  });

  it('skips (with a warning) when there is no EAS projectId yet', async () => {
    mockConstants.expoConfig = {};
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns null without registering when permission is denied', async () => {
    mockNotifications.getPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
    mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' } as any);
    await expect(registerForPushNotifications()).resolves.toBeNull();
    expect(mockApi.post).not.toHaveBeenCalled();
  });
});

describe('unregisterPushNotifications', () => {
  it('deletes the stored token from the backend and forgets it', async () => {
    await AsyncStorage.setItem('push_token', 'ExponentPushToken[abc]');
    await unregisterPushNotifications();
    expect(mockApi.delete).toHaveBeenCalledWith('/notifications/push-token/', { data: { token: 'ExponentPushToken[abc]' } });
    expect(await AsyncStorage.getItem('push_token')).toBeNull();
  });

  it('does nothing when this device never registered', async () => {
    await unregisterPushNotifications();
    expect(mockApi.delete).not.toHaveBeenCalled();
  });
});

describe('useNotifications', () => {
  it('opens the tapped listing when a notification launched the app from closed', async () => {
    useAuthStore.setState({ token: null, user: null });
    mockNotifications.getLastNotificationResponseAsync.mockResolvedValueOnce({
      actionIdentifier: mockNotifications.DEFAULT_ACTION_IDENTIFIER,
      notification: { request: { content: { data: { type: 'alert_digest', kind: 'tender', count: 1, id: 7 } } } },
    } as any);
    await renderHook(() => useNotifications());
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('App', {
      screen: 'Tenders', params: { screen: 'TenderDetail', params: { tenderId: 7 } },
    }));
    expect(mockNotifications.clearLastNotificationResponseAsync).toHaveBeenCalled();
    expect(mockApi.post).not.toHaveBeenCalled(); // guests don't register for push
  });
});
