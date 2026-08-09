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
const ROLES = [
  { id: 'seeker',  label: 'Job Seeker',        desc: 'Browse & apply for jobs',                    icon: User         },
  { id: 'company', label: 'Employer',           desc: 'Post jobs & manage a career page',           icon: Briefcase    },
  { id: 'store',   label: 'Online Store',       desc: 'List your online store on Shopping section', icon: ShoppingBag  },
  { id: 'retail',  label: 'Retail Store',       desc: 'List your offline retail chain or shop',     icon: MapPin       },
]

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
const detailsSchema = z.object({
  role: z.enum(['seeker', 'company', 'store', 'retail']),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  // Company fields
  company_name: z.string().optional(),
  gstin: z.string().optional(),
  pan_number: z.string().optional(),
  aadhar_number: z.string().optional(),
  // Store fields
  store_name: z.string().optional(),
  store_category: z.string().optional(),
  store_url: z.string().optional(),
  store_locator_url: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'company') {
    if (!data.company_name?.trim()) {
      ctx.addIssue({ path: ['company_name'], code: z.ZodIssueCode.custom, message: 'Company name is required' })
    }
    const hasId = data.gstin?.trim() || data.pan_number?.trim() || data.aadhar_number?.trim()
    if (!hasId) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Provide at least one verification ID' })
    }
    if (data.gstin?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(data.gstin.trim())) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Enter a valid 15-character GSTIN' })
    }
    if (data.pan_number?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(data.pan_number.trim())) {
      ctx.addIssue({ path: ['pan_number'], code: z.ZodIssueCode.custom, message: 'Enter a valid 10-character PAN (e.g. ABCDE1234F)' })
    }
    if (data.aadhar_number?.trim() && !/^[0-9]{12}$/.test(data.aadhar_number.trim())) {
      ctx.addIssue({ path: ['aadhar_number'], code: z.ZodIssueCode.custom, message: 'Aadhar must be exactly 12 digits' })
    }
  }

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

const otpSchema = z.object({
  otp: z.string().length(6, 'Enter the 6-digit OTP'),
})

// ── Component ─────────────────────────────────────────────────────────────────
export default function Register() {
  const { register: registerUser } = useAuth()
  const { state } = useLocation()

  const [step, setStep] = useState(0)
  const [savedData, setSavedData] = useState(null)
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const initialRole = ['seeker', 'company', 'store', 'retail'].includes(state?.role) ? state.role : 'seeker'

  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { role: initialRole },
  })
  const role = detailsForm.watch('role')

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

  const otpForm = useForm({ resolver: zodResolver(otpSchema) })

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
      const detail = err?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail).flat()[0]
        setError(typeof first === 'string' ? first : 'Registration failed. Please try again.')
      } else {
        setError(err?.response?.data?.detail || 'Incorrect OTP. Please try again.')
      }
    }
  }

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

        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Create your account</h1>
              <p className="text-muted-foreground mt-1">Join Linksdoor today</p>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
            )}

            <form onSubmit={detailsForm.handleSubmit(onDetailsSubmit)} className="space-y-5">

              {/* Role selector */}
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

              {/* Company fields */}
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

              {/* Store owner fields */}
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

              {/* Retail store owner fields */}
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

        {/* ── Step 1: OTP ── */}
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

function Divider() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 border-t border-border" />
      <span className="text-xs text-muted-foreground">or</span>
      <div className="flex-1 border-t border-border" />
    </div>
  )
}
