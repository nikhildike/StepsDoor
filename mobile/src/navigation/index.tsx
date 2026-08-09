import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '@/store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { SplashScreen } from '@/screens/auth/SplashScreen';

export function RootNavigator() {
  const { token } = useAuthStore();
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <SplashScreen onReady={() => setLoading(false)} />;
  }

  return (
    <NavigationContainer>
      {token ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
