/**
 * ChangePasswordForm.tsx
 *
 * Shared "change password" form used by `SettingsScreen` for any signed-in
 * account role (job seeker, company, contractor) — they all hit the same
 * backend `/api/auth/change-password/` endpoint, so no role-specific variant
 * is needed. Mirrors `frontend/src/components/account/ChangePasswordForm.jsx`.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { authService } from '@/services/authService';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { BorderRadius, Spacing } from '@/theme/spacing';

interface FormData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * Renders the Current / New / Confirm password fields and a submit button.
 * Posts to the shared auth endpoint and resets the form with a success
 * message on completion. Reads no props. Use case: `SettingsScreen`'s
 * "Account" section, for any signed-in user.
 */
export function ChangePasswordForm() {
  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormData>();
  // Success/error banners shown below the form after a submit attempt.
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Form submit handler: posts old/new password, resets the form and shows a
  // success banner on completion, or surfaces the backend's error detail
  // (e.g. "Current password is incorrect.") on failure.
  const onSubmit = async (data: FormData) => {
    try {
      setError('');
      setSuccess(false);
      await authService.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      });
      setSuccess(true);
      reset();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (detail && typeof detail === 'object') {
        const first = Object.values(detail).flat()[0];
        setError(typeof first === 'string' ? first : 'Failed to change password.');
      } else {
        setError('Failed to change password.');
      }
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Change Password</Text>

      {/* Error banner: only shown after a failed submit attempt */}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {/* Success banner: only shown after a successful submit */}
      {success ? <Text style={styles.success}>Password changed successfully.</Text> : null}

      <Controller
        control={control}
        name="old_password"
        rules={{ required: 'Current password is required' }}
        render={({ field }) => (
          <Input
            label="Current Password"
            secureTextEntry
            error={errors.old_password?.message}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <View style={styles.spacer} />
      <Controller
        control={control}
        name="new_password"
        rules={{ required: 'New password is required', minLength: { value: 8, message: 'Must be at least 8 characters' } }}
        render={({ field }) => (
          <Input
            label="New Password"
            secureTextEntry
            error={errors.new_password?.message}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <View style={styles.spacer} />
      <Controller
        control={control}
        name="confirm_password"
        rules={{
          required: 'Please confirm your new password',
          validate: (value) => value === watch('new_password') || 'Passwords do not match',
        }}
        render={({ field }) => (
          <Input
            label="Confirm New Password"
            secureTextEntry
            error={errors.confirm_password?.message}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <View style={{ height: Spacing[5] }} />
      <Button
        title={isSubmitting ? 'Changing...' : 'Change Password'}
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
      />
    </View>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[4],
  },
  heading: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text, marginBottom: Spacing[3] },
  spacer: { height: Spacing[4] },
  error: {
    backgroundColor: '#FEE2E2',
    color: Colors.error,
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
    fontSize: FontSize.sm,
    marginBottom: Spacing[3],
  },
  success: {
    backgroundColor: '#DCFCE7',
    color: '#15803D',
    padding: Spacing[3],
    borderRadius: BorderRadius.md,
    fontSize: FontSize.sm,
    marginBottom: Spacing[3],
  },
});
