/**
 * ChangePasswordForm.jsx
 *
 * Shared "change password" form, reused across every logged-in account
 * type's profile page (`pages/seeker/Profile.jsx`, `pages/company/Profile.jsx`,
 * `pages/store/StoreProfile.jsx`) since they all authenticate against the
 * same backend `User` model and the same `/api/auth/change-password/`
 * endpoint — no role-specific variant is needed.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Zod validation schema: new_password must be at least 8 chars (matches the
// backend's AUTH_PASSWORD_VALIDATORS MinimumLengthValidator) and must match confirm_password.
const schema = z.object({
  old_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'New password must be at least 8 characters'),
  confirm_password: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

/**
 * Renders a self-contained "Change Password" form card: current password,
 * new password, confirm new password. Posts to the shared auth endpoint and
 * resets the form on success.
 */
export function ChangePasswordForm() {
  // Whether the "Password changed" confirmation should currently be shown.
  const [saved, setSaved] = useState(false)
  // Error message surfaced from a failed change-password request (e.g. wrong current password).
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  // Form submit handler: posts old/new password to the backend, clears the
  // form on success, or surfaces the backend's error detail on failure
  // (e.g. "Current password is incorrect.").
  const onSubmit = async (data) => {
    try {
      setError('')
      setSaved(false)
      await authService.changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      })
      setSaved(true)
      reset()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      const detail = err?.response?.data
      if (typeof detail === 'object' && detail) {
        const first = Object.values(detail).flat()[0]
        setError(typeof first === 'string' ? first : 'Failed to change password.')
      } else {
        setError('Failed to change password.')
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-border p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Change Password</h2>
        <p className="text-sm text-muted-foreground mt-1">Update the password used to sign in.</p>
      </div>

      {/* Error banner for a failed change (wrong current password, validation failure, etc.). */}
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {/* Temporary success confirmation after a successful change (auto-hides after 3s). */}
      {saved && <p className="text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-md">Password changed successfully.</p>}

      <div>
        <label className="text-sm font-medium">Current Password</label>
        <Input {...register('old_password')} type="password" className="mt-1" />
        {errors.old_password && <p className="text-xs text-destructive mt-1">{errors.old_password.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">New Password</label>
        <Input {...register('new_password')} type="password" className="mt-1" />
        {errors.new_password && <p className="text-xs text-destructive mt-1">{errors.new_password.message}</p>}
      </div>

      <div>
        <label className="text-sm font-medium">Confirm New Password</label>
        <Input {...register('confirm_password')} type="password" className="mt-1" />
        {errors.confirm_password && <p className="text-xs text-destructive mt-1">{errors.confirm_password.message}</p>}
      </div>

      <div className="pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Changing...' : 'Change Password'}
        </Button>
      </div>
    </form>
  )
}