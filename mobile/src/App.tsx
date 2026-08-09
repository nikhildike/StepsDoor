import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/navigation';
import { useNotifications } from '@/hooks/useNotifications';

function NotificationSetup() {
  useNotifications();
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="auto" />
      <NotificationSetup />
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
