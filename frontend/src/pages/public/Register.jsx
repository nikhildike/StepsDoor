/**
 * Register.jsx
 *
 * Public sign-up page mounted at `/register` (see App.jsx). Two-step flow:
 * (1) collect role + account details (with role-specific verification
 * fields for companies/stores) validated via Zod, send an email OTP; then
 * (2) verify the OTP and complete registration via `useAuth().register`.
 * Handles all four account roles StepsDoor supports: job seeker, employer
 * (company), online store owner, and retail store owner.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation } from 'react-router-dom'
import { Briefcase, MapPin, ShoppingBag, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ── Role ─────────────────────────────────────────────────────────────────────
// The four account types a visitor can register as; each renders its own
// set of extra fields below (see role === 'company' / 'store' / 'retail').
const ROLES = [
  { id: 'seeker',  label: 'Job Seeker',        desc: 'Browse & apply for jobs',                    icon: User         },
  { id: 'company', label: 'Employer',           desc: 'Post jobs & manage a career page',           icon: Briefcase    },
  { id: 'store',   label: 'Online Store',       desc: 'List your online store on Shopping section', icon: ShoppingBag  },
  { id: 'retail',  label: 'Retail Store',       desc: 'List your offline retail chain or shop',     icon: MapPin       },
]

// Dropdown options for an online store's category (role === 'store')
const STORE_CATEGORIES = [
  { value: 'marketplaces', label: 'General Marketplaces' },
  { value: 'fashion',      label: 'Fashion & Apparel'    },
  { value: 'footwear',     label: 'Footwear'             },
  { value: 'electronics',  label: 'Electronics & Mobiles'},
  { value: 'grocery',      label: 'Grocery & Quick Commerce' },
  { value: 'beauty',       label: 'Beauty & Personal Care'},
  { value: 'pharmacy',     label: 'Pharmacy & Health'    },
  { value: 'home',         label: 'Home, Furniture & Decor' },
  { value: 'jewellery',    label: 'Jewellery'            },
  { value: 'books',        label: 'Books & Stationery'   },
  { value: 'baby',         label: 'Baby & Kids'          },
  { value: 'sports',       label: 'Sports & Fitness'     },
  { value: 'eyewear',      label: 'Eyewear & Watches'    },
  { value: 'refurbished',  label: 'Refurbished & Second-Hand' },
  { value: 'bags',         label: 'Bags & Luggage'       },
  { value: 'global',       label: 'Global (Ships to India)' },
  { value: 'other',        label: 'Other'                },
]

// Dropdown options for an offline retail chain's category (role === 'retail')
const RETAIL_CATEGORIES = [
  { value: 'supermarkets',   label: 'Supermarkets & Hypermarkets' },
  { value: 'department',     label: 'Department Stores'           },
  { value: 'electronics',    label: 'Electronics & Mobiles'       },
  { value: 'jewellery',      label: 'Jewellery'                   },
  { value: 'pharmacy',       label: 'Pharmacy & Health'           },
  { value: 'beauty',         label: 'Beauty & Personal Care'      },
  { value: 'footwear',       label: 'Footwear'                    },
  { value: 'sports',         label: 'Sports & Fitness'            },
  { value: 'home',           label: 'Home & Furniture'            },
  { value: 'books',          label: 'Books & Stationery'          },
  { value: 'food_qsr',       label: 'Food & QSR Chains'          },
  { value: 'auto',           label: 'Auto & Accessories'          },
  { value: 'other',          label: 'Other'                       },
]

// ── Validation ────────────────────────────────────────────────────────────────
// Step-0 "details" form schema. Base fields (role/email/password) are always
// required; company/store fields are declared optional here because they
// only apply to some roles — their real requirement rules run conditionally
// in the superRefine() below, which also runs the format checks (GSTIN/PAN/
// Aadhar/URL regexes) once a value is actually provided.
const detailsSchema = z.object({
  role: z.enum(['seeker', 'company', 'store', 'retail']), // which of the four account types is being created
  email: z.string().email('Enter a valid email address'), // used for both login and the OTP verification step
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Company fields (role === 'company')
  company_name: z.string().optional(),
  gstin: z.string().optional(),      // shared verification ID field, also used by store/retail roles
  pan_number: z.string().optional(), // shared verification ID field, also used by store/retail roles
  aadhar_number: z.string().optional(), // shared verification ID field, also used by store/retail roles
  // Store fields (role === 'store' or 'retail')
  store_name: z.string().optional(),
  store_category: z.string().optional(),
  store_url: z.string().optional(),
  store_locator_url: z.string().optional(),
}).superRefine((data, ctx) => {
  // Company-specific rules: name is required, and at least one of
  // GSTIN/PAN/Aadhar must be supplied to verify the business — each ID is
  // format-checked with a regex only when the user actually enters one.
  if (data.role === 'company') {
    if (!data.company_name?.trim()) {
      ctx.addIssue({ path: ['company_name'], code: z.ZodIssueCode.custom, message: 'Company name is required' })
    }
    const hasId = data.gstin?.trim() || data.pan_number?.trim() || data.aadhar_number?.trim()
    if (!hasId) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Provide at least one verification ID' })
    }
    // GSTIN format: 2-digit state code + 10-char PAN + entity code + 'Z' + checksum char
    if (data.gstin?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(data.gstin.trim())) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Enter a valid 15-character GSTIN' })
    }
    // PAN format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
    if (data.pan_number?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(data.pan_number.trim())) {
      ctx.addIssue({ path: ['pan_number'], code: z.ZodIssueCode.custom, message: 'Enter a valid 10-character PAN (e.g. ABCDE1234F)' })
    }
    // Aadhar format: exactly 12 digits
    if (data.aadhar_number?.trim() && !/^[0-9]{12}$/.test(data.aadhar_number.trim())) {
      ctx.addIssue({ path: ['aadhar_number'], code: z.ZodIssueCode.custom, message: 'Aadhar must be exactly 12 digits' })
    }
  }

  // Store/retail-specific rules: store name and website URL are required,
  // the locator URL (if given) must also be a valid http(s) URL, and — same
  // as companies — at least one verification ID must be supplied.
  if (data.role === 'store' || data.role === 'retail') {
    if (!data.store_name?.trim()) {
      ctx.addIssue({ path: ['store_name'], code: z.ZodIssueCode.custom, message: 'Store name is required' })
    }
    if (!data.store_url?.trim()) {
      ctx.addIssue({ path: ['store_url'], code: z.ZodIssueCode.custom, message: 'Store website URL is required' })
    }
    if (data.store_url?.trim() && !/^https?:\/\/.+/.test(data.store_url.trim())) {
      ctx.addIssue({ path: ['store_url'], code: z.ZodIssueCode.custom, message: 'Enter a valid URL starting with http:// or https://' })
    }
    if (data.store_locator_url?.trim() && !/^https?:\/\/.+/.test(data.store_locator_url.trim())) {
      ctx.addIssue({ path: ['store_locator_url'], code: z.ZodIssueCode.custom, message: 'Enter a valid URL starting with http:// or https://' })
    }
    const hasId = data.gstin?.trim() || data.pan_number?.trim() || data.aadhar_number?.trim()
    if (!hasId) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Provide at least one verification ID' })
    }
  }
})

// Step-1 "verify OTP" form schema — the code emailed by authService.sendOtp must be exactly 6 digits/characters
const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit OTP'),
})

// ── Component ─────────────────────────────────────────────────────────────────
/**
 * Renders the two-step registration flow: a role/details form (step 0) and
 * an OTP verification form (step 1). Supports pre-selecting a role via
 * router location state (e.g. Pricing.jsx links here with
 * `navigate('/register', { state: { role: 'company' } })`).
 */
export default function Register() {
  const { register: registerUser } = useAuth()
  const { state } = useLocation() // may carry { role } to pre-select a tab, e.g. from the Pricing page CTAs

  const [step, setStep] = useState(0) // 0 = details form, 1 = OTP verification form
  const [savedData, setSavedData] = useState(null) // details form values, kept around to submit alongside the verified OTP
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0) // seconds remaining before "Resend OTP" is clickable again

  const initialRole = ['seeker', 'company', 'store', 'retail'].includes(state?.role) ? state.role : 'seeker'

  // Step-0 form: role + account details, validated against detailsSchema
  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { role: initialRole },
  })
  const role = detailsForm.watch('role') // re-renders role-specific field sections as the user switches tabs

  // Step-0 submit handler — requests an email OTP for the entered address,
  // stashes the form data (needed again once the OTP is verified), advances
  // to step 1, and starts the 60s resend cooldown.
  const onDetailsSubmit = async (data) => {
    try {
      setError('')
      await authService.sendOtp(data.email)
      setSavedData(data)
      setStep(1)
      startResendCooldown()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not send OTP. Please try again.')
    }
  }

  // Step-1 form: just the 6-digit OTP, validated against otpSchema
  const otpForm = useForm({ resolver: zodResolver(otpSchema) })

  // Step-1 submit handler — verifies the OTP against the API, then completes
  // registration by calling useAuth().register with the step-0 details plus
  // role-derived flags (is_company/is_store_owner/is_job_seeker/store_type)
  // and the verified_token proving the email was confirmed.
  const onVerifyOtp = async ({ otp }) => {
    try {
      setError('')
      const { data: tokenData } = await authService.verifyOtp(savedData.email, otp)
      const isStoreRole = savedData.role === 'store' || savedData.role === 'retail'
      await registerUser({
        ...savedData,
        is_company: savedData.role === 'company',
        is_store_owner: isStoreRole,
        is_job_seeker: savedData.role === 'seeker',
        store_type: savedData.role === 'retail' ? 'retail' : 'online',
        email_verified_token: tokenData.verified_token,
      })
    } catch (err) {
      // Surface the first field-level validation error from the API, or a
      // generic detail message, or fall back to a generic OTP failure string.
      const detail = err?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail).flat()[0]
        setError(typeof first === 'string' ? first : 'Registration failed. Please try again.')
      } else {
        setError(err?.response?.data?.detail || 'Incorrect OTP. Please try again.')
      }
    }
  }

  // "Resend OTP" handler — re-requests a code for the same email, clears the
  // OTP input, and restarts the cooldown.
  const onResendOtp = async () => {
    try {
      setError('')
      await authService.sendOtp(savedData.email)
      otpForm.reset()
      startResendCooldown()
    } catch (err) {
      setError(err?.response?.data?.detail || 'Could not resend OTP.')
    }
  }

  // Starts a 60-second countdown (ticking every second) that disables the
  // "Resend OTP" button until it reaches zero.
  function startResendCooldown() {
    setResendCooldown(60)
    const id = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(id); return 0 }
        return c - 1
      })
    }, 1000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">

        {/* ── Step 0: Details (role + email/password + role-specific fields) ── */}
        {step === 0 && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-muted-foreground mt-1">Join StepsDoor today</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="space-y-5">

              {/* Role selector — clicking a tile sets the `role` field, which
                  drives which extra field block (company/store/retail) renders below */}
              <div>
                <p className="text-sm font-medium mb-2">I am registering as</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ id, label, desc, icon: Icon }) => {
                    const active = role === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => detailsForm.setValue('role', id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                          active
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-semibold leading-tight">{label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {ROLES.find(r => r.id === role)?.desc}
                </p>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input {...detailsForm.register('email')} type="email" placeholder="you@example.com" className="mt-1" />
                {detailsForm.formState.errors.email && (
                  <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="text-sm font-medium">Password</label>
                <Input {...detailsForm.register('password')} type="password" placeholder="Min. 8 characters" className="mt-1" />
                {detailsForm.formState.errors.password && (
                  <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.password.message}</p>
                )}
              </div>

              {/* Company fields — only rendered/registered when role === 'company' */}
              {role === 'company' && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Company Details</p>

                  <div>
                    <label className="text-sm font-medium">Company Name <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('company_name')} placeholder="Acme Pvt. Ltd." className="mt-1" />
                    {detailsForm.formState.errors.company_name && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.company_name.message}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Provide at least one ID to verify your business:</p>

                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input {...detailsForm.register('gstin')} placeholder="22AAAAA0000A1Z5" maxLength={15} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.gstin && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.gstin.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">PAN <span className="text-xs text-muted-foreground">(Company or Personal)</span></label>
                    <Input {...detailsForm.register('pan_number')} placeholder="ABCDE1234F" maxLength={10} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.pan_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.pan_number.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">Aadhar Number <span className="text-xs text-muted-foreground">(Personal)</span></label>
                    <Input {...detailsForm.register('aadhar_number')} placeholder="XXXXXXXXXXXX" maxLength={12} inputMode="numeric" className="mt-1" />
                    {detailsForm.formState.errors.aadhar_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.aadhar_number.message}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Store owner fields — only rendered/registered when role === 'store' */}
              {role === 'store' && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Store Details</p>

                  <div>
                    <label className="text-sm font-medium">Store Name <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('store_name')} placeholder="My Awesome Store" className="mt-1" />
                    {detailsForm.formState.errors.store_name && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      {...detailsForm.register('store_category')}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a category</option>
                      {STORE_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Store Website URL <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('store_url')} placeholder="https://mystore.com" type="url" className="mt-1" />
                    {detailsForm.formState.errors.store_url && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_url.message}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Provide at least one ID to verify your business:</p>

                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input {...detailsForm.register('gstin')} placeholder="22AAAAA0000A1Z5" maxLength={15} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.gstin && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.gstin.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">PAN</label>
                    <Input {...detailsForm.register('pan_number')} placeholder="ABCDE1234F" maxLength={10} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.pan_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.pan_number.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">Aadhar Number</label>
                    <Input {...detailsForm.register('aadhar_number')} placeholder="XXXXXXXXXXXX" maxLength={12} inputMode="numeric" className="mt-1" />
                    {detailsForm.formState.errors.aadhar_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.aadhar_number.message}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground bg-blue-50 text-blue-700 rounded-lg px-3 py-2">
                    Store listing uses the same subscription pricing as employer accounts — starting at ₹299/month.
                  </p>
                </div>
              )}

              {/* Retail store owner fields — only rendered/registered when role === 'retail' */}
              {role === 'retail' && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Retail Store Details</p>

                  <div>
                    <label className="text-sm font-medium">Brand / Chain Name <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('store_name')} placeholder="e.g. Reliance Fresh" className="mt-1" />
                    {detailsForm.formState.errors.store_name && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      {...detailsForm.register('store_category')}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a category</option>
                      {RETAIL_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Brand Website URL <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('store_url')} placeholder="https://reliancefresh.in" type="url" className="mt-1" />
                    {detailsForm.formState.errors.store_url && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_url.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Store Locator URL <span className="text-muted-foreground text-xs">(optional)</span></label>
                    <Input {...detailsForm.register('store_locator_url')} placeholder="https://reliancefresh.in/stores" type="url" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Link to your store finder / branch locator page</p>
                    {detailsForm.formState.errors.store_locator_url && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_locator_url.message}</p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">Provide at least one ID to verify your business:</p>

                  <div>
                    <label className="text-sm font-medium">GSTIN</label>
                    <Input {...detailsForm.register('gstin')} placeholder="22AAAAA0000A1Z5" maxLength={15} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.gstin && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.gstin.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">PAN</label>
                    <Input {...detailsForm.register('pan_number')} placeholder="ABCDE1234F" maxLength={10} className="mt-1 uppercase" />
                    {detailsForm.formState.errors.pan_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.pan_number.message}</p>
                    )}
                  </div>

                  <Divider />

                  <div>
                    <label className="text-sm font-medium">Aadhar Number</label>
                    <Input {...detailsForm.register('aadhar_number')} placeholder="XXXXXXXXXXXX" maxLength={12} inputMode="numeric" className="mt-1" />
                    {detailsForm.formState.errors.aadhar_number && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.aadhar_number.message}</p>
                    )}
                  </div>

                  <p className="text-xs bg-green-50 text-green-700 rounded-lg px-3 py-2">
                    Your listing appears on the Retail Stores page with a verified badge and "Find Store" button — starting at ₹299/month.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={detailsForm.formState.isSubmitting}>
                {detailsForm.formState.isSubmitting ? 'Sending OTP...' : 'Continue'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </>
        )}

        {/* ── Step 1: OTP verification ── */}
        {step === 1 && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Verify your email</h1>
              <p className="text-muted-foreground mt-1">
                We sent a 6-digit code to{' '}
                <span className="font-medium text-foreground">{savedData?.email}</span>
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">OTP</label>
                <Input
                  {...otpForm.register('otp')}
                  placeholder="123456"
                  maxLength={6}
                  inputMode="numeric"
                  className="mt-1 text-center text-2xl tracking-[0.5em]"
                  autoFocus
                />
                {otpForm.formState.errors.otp && (
                  <p className="text-xs text-destructive mt-1">{otpForm.formState.errors.otp.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
                {otpForm.formState.isSubmitting ? 'Verifying...' : 'Verify & Create Account'}
              </Button>
            </form>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => { setStep(0); setError('') }}
                className="text-muted-foreground hover:text-foreground"
              >
                ← Edit details
              </button>
              <button
                type="button"
                onClick={onResendOtp}
                disabled={resendCooldown > 0}
                className="text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

// Small "or" divider used between the GSTIN/PAN/Aadhar verification ID fields
function Divider() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
