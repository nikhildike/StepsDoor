import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { JobsStackNavigator } from './JobsStackNavigator';
import { TendersStackNavigator } from './TendersStackNavigator';
import { GovtJobsStackNavigator } from './GovtJobsStackNavigator';
import { SearchScreen } from '@/screens/jobs/SearchScreen';
import { AlertsScreen } from '@/screens/seeker/AlertsScreen';
import { ProfileScreen } from '@/screens/seeker/ProfileScreen';
import { Colors } from '@/theme/colors';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, string> = {
  Jobs: 'briefcase-outline',
  Search: 'search-outline',
  Tenders: 'document-text-outline',
  'Govt Jobs': 'school-outline',
  Alerts: 'notifications-outline',
  Profile: 'person-outline',
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={(TAB_ICONS[route.name] ?? 'ellipse-outline') as any}
            size={size}
            color={color}
          />
        ),
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Jobs" component={JobsStackNavigator} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Tenders" component={TendersStackNavigator} />
      <Tab.Screen name="Govt Jobs" component={GovtJobsStackNavigator} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
