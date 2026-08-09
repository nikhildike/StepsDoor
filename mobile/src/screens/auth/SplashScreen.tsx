import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { useAuthStore } from '@/store/authStore';

interface Props {
  onReady: (isAuthenticated: boolean) => void;
}

export function SplashScreen({ onReady }: Props) {
  const { loadFromStorage, token } = useAuthStore();

  useEffect(() => {
    loadFromStorage().then(() => {
      setTimeout(() => onReady(!!token), 800);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Linksdoor</Text>
      <Text style={styles.tagline}>Jobs & Tenders in India</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold, color: Colors.white },
  tagline: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
});
