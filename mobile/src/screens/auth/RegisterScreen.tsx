import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Colors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing, BorderRadius } from '@/theme/spacing';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';

interface FormData { username: string; email: string; password: string; }

export function RegisterScreen({ navigation }: { navigation: any }) {
  const { register } = useAuth();
  const [error, setError] = useState('');
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      await register({ ...data, is_job_seeker: true });
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Registration failed. Please try again.');
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Find jobs and tenders in India</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={{ gap: Spacing[4] }}>
          <Controller control={control} name="username" rules={{ required: 'Username is required' }}
            render={({ field }) => <Input label="Username" placeholder="yourname" autoCapitalize="none" error={errors.username?.message} onChangeText={field.onChange} value={field.value} />} />
          <Controller control={control} name="email" rules={{ required: 'Email is required' }}
            render={({ field }) => <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={errors.email?.message} onChangeText={field.onChange} value={field.value} />} />
          <Controller control={control} name="password" rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
            render={({ field }) => <Input label="Password" placeholder="••••••••" secureTextEntry error={errors.password?.message} onChangeText={field.onChange} value={field.value} />} />
          <Button title={isSubmitting ? 'Creating account...' : 'Create account'} onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center' },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing[6] },
  error: { backgroundColor: '#FEE2E2', color: Colors.error, padding: Spacing[3], borderRadius: BorderRadius.md, fontSize: FontSize.sm, marginBottom: Spacing[4] },
  link: { marginTop: Spacing[6], alignItems: 'center' },
  linkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkBold: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
