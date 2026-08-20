/**
 * Login.jsx
 *
 * Public sign-in page mounted at `/login` (see App.jsx). Renders an
 * email/password form validated with Zod + React Hook Form and delegates
 * the actual authentication call to the `useAuth` hook (which handles
 * token storage / redirect on success).
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Login form schema:
// - username: submitted as an email address (backend uses email as the login identifier)
// - password: just needs to be non-empty here — the server enforces the real password policy
const schema = z.object({
  username: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

/**
 * Renders the "Sign in to StepsDoor" form. Used by anyone (job seeker,
 * company, or store owner) authenticating with an existing account;
 * `useAuth().login` figures out the resulting role and redirects.
 */
export default function Login() {
  const { login } = useAuth()
  const [error, setError] = useState('') // top-of-form error banner text (e.g. invalid credentials)
  // React Hook Form wired to the Zod schema above for client-side validation
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  // Form submit handler — fires once client-side validation passes.
  // Calls the shared auth hook's login() (which hits the API, stores the
  // JWT, and navigates away) and surfaces any API error inline.
  const onSubmit = async (data) => {
    try {
      setError('')
      await login(data)
    } catch (err) {
      setError(err?.response?.data?.detail || 'Invalid email or password.')
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Sign in to StepsDoor</h1>
          <p className="text-muted-foreground mt-2">Welcome back</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* API/auth error banner — only rendered once a submit attempt fails */}
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
          )}

          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              {...register('username')}
              type="email"
              placeholder="you@example.com"
              className="mt-1"
              autoComplete="email"
            />
            {errors.username && (
              <p className="text-xs text-destructive mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">Password</label>
            </div>
            <Input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
        </p>
      </div>
    </div>
  )
}
