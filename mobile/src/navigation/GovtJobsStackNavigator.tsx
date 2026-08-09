import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GovtJobsScreen } from '@/screens/govtjobs/GovtJobsScreen';
import { GovtJobDetailScreen } from '@/screens/govtjobs/GovtJobDetailScreen';
import { Colors } from '@/theme/colors';

const Stack = createNativeStackNavigator();

export function GovtJobsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="GovtJobsList" component={GovtJobsScreen} options={{ title: 'Govt Jobs' }} />
      <Stack.Screen name="GovtJobDetail" component={GovtJobDetailScreen} options={{ title: 'Job Detail' }} />
    </Stack.Navigator>
  );
}
