/**
 * LoginScreen.tsx
 *
 * Job-seeker sign-in screen: username/password form with inline validation
 * errors. Belongs to `AuthNavigator`'s stack (Login → Register), which
 * `RootNavigator` renders while there is no stored auth token. Submitting
 * successfully triggers `useAuth().login`, which persists the token and lets
 * `RootNavigator` switch over to `AppNavigator`.
 */
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

/**
 * Renders the sign-in form (email/username + password) and a link to
 * `RegisterScreen`. Reads no route params; `navigation` (see `Props`) is used
 * only to navigate to the Register screen. Use case: entry point for an
 * existing job seeker to authenticate before accessing saved jobs, alerts,
 * and profile features that require a logged-in user.
 */
export function LoginScreen({ navigation }: Props) {
  // Exposes the login() action, which calls authService and persists the
  // resulting token/user to the auth store (AsyncStorage) on success.
  const { login } = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();

  // Form submit handler (wired via handleSubmit below). Fires when the user
  // taps "Sign in" and client-side validation passes. Attempts login with the
  // entered credentials and surfaces a generic error message on failure.
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
        <Text style={styles.subtitle}>Welcome back to StepsDoor</Text>

        {/* Error banner: only shown after a failed submit attempt */}
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

        {/* Navigates to RegisterScreen within the same AuthNavigator stack */}
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
