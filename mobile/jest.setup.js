// Jest setup (wired via package.json `jest.setupFiles`) — swaps the native
// AsyncStorage module for its official in-memory mock so stores like
// `src/store/themeStore.ts` can be unit-tested without a device/simulator.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
