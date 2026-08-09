import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TendersScreen } from '@/screens/tenders/TendersScreen';
import { TenderDetailScreen } from '@/screens/tenders/TenderDetailScreen';
import { Colors } from '@/theme/colors';

const Stack = createNativeStackNavigator();

export function TendersStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.white,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen name="TendersList" component={TendersScreen} options={{ title: 'Tenders' }} />
      <Stack.Screen name="TenderDetail" component={TenderDetailScreen} options={{ title: 'Tender Detail' }} />
    </Stack.Navigator>
  );
}
