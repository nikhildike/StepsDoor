/**
 * RegisterScreen.tsx
 *
 * Job-seeker sign-up screen. Belongs to `AuthNavigator`'s stack
 * (Login → Register), reached by navigating to the root stack's "Auth"
 * screen (e.g. from `ProfileScreen`'s guest prompt) — browsing the app
 * itself never requires registering. Two-step flow, mirroring
 * `frontend/src/pages/public/Register.jsx`: (1) collect email/password and
 * request an email OTP; (2) verify the OTP and complete registration via
 * `useAuth().register`, then dismiss the "Auth" screen via the parent
 * navigator so the user lands back on `AppNavigator`.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useThemeColors, ThemeColors } from '@/theme/colors';
import { FontSize, FontWeight } from '@/theme/typography';
import { Spacing, BorderRadius } from '@/theme/spacing';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { authService } from '@/services/authService';
import { ScreenWrapper } from '@/components/common/ScreenWrapper';

interface DetailsFormData { email: string; password: string; }
interface OtpFormData { otp: string; }

/**
 * Renders the two-step account-creation flow (details form, then OTP
 * verification) and a link back to `LoginScreen`. Reads no route params;
 * `navigation` is used only to navigate to Login. Use case: lets a new job
 * seeker create an account so they can save jobs and manage alerts.
 */
export function RegisterScreen({ navigation }: { navigation: any }) {
  // Exposes the register() action, which calls authService.register and
  // persists the resulting token/user to the auth store on success.
  const { register } = useAuth();
  const [error, setError] = useState('');
  // 0 = details form (email/password), 1 = OTP verification form
  const [step, setStep] = useState<0 | 1>(0);
  // Details form values, kept around to submit alongside the verified OTP
  const [savedData, setSavedData] = useState<DetailsFormData | null>(null);

  const detailsForm = useForm<DetailsFormData>();
  const otpForm = useForm<OtpFormData>();
  const Colors = useThemeColors();
  const styles = makeStyles(Colors);

  // Step-0 submit handler: requests an email OTP for the entered address,
  // stashes the form data (needed again once the OTP is verified), and
  // advances to the OTP step.
  const onDetailsSubmit = async (data: DetailsFormData) => {
    try {
      setError('');
      await authService.sendOtp(data.email);
      setSavedData(data);
      setStep(1);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not send OTP. Please try again.');
    }
  };

  // Step-1 submit handler: verifies the OTP against the API, then completes
  // registration as a job seeker using the saved details plus the
  // verified_token proving the email was confirmed. On success, dismisses
  // the "Auth" screen (on the parent/root stack) to return to the App tabs.
  const onVerifyOtp = async ({ otp }: OtpFormData) => {
    if (!savedData) return;
    try {
      setError('');
      const { data: tokenData } = await authService.verifyOtp(savedData.email, otp);
      await register({
        email: savedData.email,
        password: savedData.password,
        is_job_seeker: true,
        email_verified_token: tokenData.verified_token,
      });
      navigation.getParent()?.goBack();
    } catch (e: any) {
      // Surface the first field-level validation error from the API, or a
      // generic detail message, or fall back to a generic OTP failure string.
      const detail = e?.response?.data;
      if (detail && typeof detail === 'object') {
        const first = Object.values(detail).flat()[0];
        setError(typeof first === 'string' ? first : 'Registration failed. Please try again.');
      } else {
        setError('Incorrect OTP. Please try again.');
      }
    }
  };

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {step === 0 ? (
          <>
            <Text style={styles.title}>Create account</Text>
            <Text style={styles.subtitle}>Find jobs and tenders in India</Text>
            {/* Error banner: only shown after a failed submit attempt */}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ gap: Spacing[4] }}>
              <Controller control={detailsForm.control} name="email" rules={{ required: 'Email is required' }}
                render={({ field }) => <Input label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" error={detailsForm.formState.errors.email?.message} onChangeText={field.onChange} value={field.value} />} />
              <Controller control={detailsForm.control} name="password" rules={{ required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } }}
                render={({ field }) => <Input label="Password" placeholder="••••••••" secureTextEntry error={detailsForm.formState.errors.password?.message} onChangeText={field.onChange} value={field.value} />} />
              <Button title={detailsForm.formState.isSubmitting ? 'Sending OTP...' : 'Continue'} onPress={detailsForm.handleSubmit(onDetailsSubmit)} loading={detailsForm.formState.isSubmitting} />
            </View>
            {/* Navigates to LoginScreen within the same AuthNavigator stack */}
            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign in</Text></Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>We sent a 6-digit code to {savedData?.email}</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ gap: Spacing[4] }}>
              <Controller control={otpForm.control} name="otp" rules={{ required: 'OTP is required', minLength: { value: 6, message: 'Enter the 6-digit OTP' }, maxLength: { value: 6, message: 'Enter the 6-digit OTP' } }}
                render={({ field }) => <Input label="OTP" placeholder="123456" keyboardType="number-pad" maxLength={6} error={otpForm.formState.errors.otp?.message} onChangeText={field.onChange} value={field.value} />} />
              <Button title={otpForm.formState.isSubmitting ? 'Verifying...' : 'Verify & Create Account'} onPress={otpForm.handleSubmit(onVerifyOtp)} loading={otpForm.formState.isSubmitting} />
            </View>
            {/* Lets the user go back and fix a mistyped email/password before resubmitting */}
            <TouchableOpacity onPress={() => { setStep(0); setError(''); }} style={styles.link}>
              <Text style={styles.linkText}>← Edit details</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

const makeStyles = (Colors: ThemeColors) => StyleSheet.create({
  container: { flexGrow: 1, padding: Spacing[6], justifyContent: 'center' },
  title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold, color: Colors.text },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing[6] },
  error: { backgroundColor: '#FEE2E2', color: Colors.error, padding: Spacing[3], borderRadius: BorderRadius.md, fontSize: FontSize.sm, marginBottom: Spacing[4] },
  link: { marginTop: Spacing[6], alignItems: 'center' },
  linkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  linkBold: { color: Colors.primary, fontWeight: FontWeight.semibold },
});
