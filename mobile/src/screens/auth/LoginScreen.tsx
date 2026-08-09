import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';

interface FormData {
  username: string;
  password: string;
}

interface Props {
  navigation: any;
}

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await login(data);
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Welcome back to Linksdoor</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            rules={{ required: 'Email is required' }}
            render={({ field }) => (
              <Input
                label="Email"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.username?.message}
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <View style={styles.spacer} />
          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required' }}
            render={({ field }) => (
              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                error={errors.password?.message}
                onChangeText={field.onChange}
                value={field.value}
              />
            )}
          />
          <View style={{ height: Spacing[6] }} />
          <Button
            title={isSubmitting ? 'Signing in...' : 'Sign in'}
            onPress={handleSubmit(onSubmit)}
            loading={isSubmitting}
          />
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.link}>
          <Text style={styles.linkText}>
            Don't have an account? <Text style={styles.linkBold}>Register</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center' },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing[6] },
  error: {
    backgroundColor: '#FEE2E2',
    color: Colors.error,
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
    fontSize: FontSize.sm,
    marginBottom: Spacing[4],
  },
  form: { gap: 0 },
  spacer: { height: Spacing[4] },
  link: { marginTop: Spacing[6], alignItems: 'center' },
  linkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkBold: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
