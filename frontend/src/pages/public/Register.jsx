/**
 * Register.jsx
 *
 * Public sign-up page mounted at `/register` (see App.jsx). Two-step flow:
 * (1) collect role + account details (with role-specific verification
 * fields for companies/stores/contractors) validated via Zod, send an
 * email OTP; then (2) verify the OTP and complete registration via
 * `useAuth().register`.
 *
 * Supports five account roles: job seeker, employer (company), store owner
 * (online *or* retail — chosen via an inline toggle within the Store
 * fields block), and contractor (for bidding on government tenders).
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation } from 'react-router-dom'
import { Briefcase, HardHat, ShoppingBag, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// ── Role ─────────────────────────────────────────────────────────────────────
// The four account types a visitor can register as. "Store" covers both
// online and retail — the sub-type is chosen via a toggle inside the Store
// fields block rather than a separate top-level role.
const ROLES = [
  { id: 'seeker',     label: 'Job Seeker', desc: 'Browse & apply for jobs',                          icon: User       },
  { id: 'company',    label: 'Employer',   desc: 'Post jobs & manage a career page',                 icon: Briefcase  },
  { id: 'store',      label: 'Store',      desc: 'List your online or retail store on StepsDoor',    icon: ShoppingBag},
  { id: 'contractor', label: 'Contractor', desc: 'Discover & bid on government tenders',             icon: HardHat    },
]

// Dropdown options for an online store's category (store_type === 'online')
const STORE_CATEGORIES = [
  { value: 'marketplaces', label: 'General Marketplaces'         },
  { value: 'fashion',      label: 'Fashion & Apparel'            },
  { value: 'footwear',     label: 'Footwear'                     },
  { value: 'electronics',  label: 'Electronics & Mobiles'        },
  { value: 'grocery',      label: 'Grocery & Quick Commerce'     },
  { value: 'beauty',       label: 'Beauty & Personal Care'       },
  { value: 'pharmacy',     label: 'Pharmacy & Health'            },
  { value: 'home',         label: 'Home, Furniture & Decor'      },
  { value: 'jewellery',    label: 'Jewellery'                    },
  { value: 'books',        label: 'Books & Stationery'           },
  { value: 'baby',         label: 'Baby & Kids'                  },
  { value: 'sports',       label: 'Sports & Fitness'             },
  { value: 'eyewear',      label: 'Eyewear & Watches'            },
  { value: 'refurbished',  label: 'Refurbished & Second-Hand'    },
  { value: 'bags',         label: 'Bags & Luggage'               },
  { value: 'global',       label: 'Global (Ships to India)'      },
  { value: 'other',        label: 'Other'                        },
]

// Dropdown options for an offline retail chain's category (store_type === 'retail')
const RETAIL_CATEGORIES = [
  { value: 'supermarkets', label: 'Supermarkets & Hypermarkets'  },
  { value: 'department',   label: 'Department Stores'            },
  { value: 'electronics',  label: 'Electronics & Mobiles'        },
  { value: 'jewellery',    label: 'Jewellery'                    },
  { value: 'pharmacy',     label: 'Pharmacy & Health'            },
  { value: 'beauty',       label: 'Beauty & Personal Care'       },
  { value: 'footwear',     label: 'Footwear'                     },
  { value: 'sports',       label: 'Sports & Fitness'             },
  { value: 'home',         label: 'Home & Furniture'             },
  { value: 'books',        label: 'Books & Stationery'           },
  { value: 'food_qsr',     label: 'Food & QSR Chains'           },
  { value: 'auto',         label: 'Auto & Accessories'           },
  { value: 'other',        label: 'Other'                        },
]

// Dropdown options for a contractor's primary work category (role === 'contractor')
const CONTRACTOR_CATEGORIES = [
  { value: 'civil',          label: 'Civil & Construction'         },
  { value: 'electrical',     label: 'Electrical Works'             },
  { value: 'mechanical',     label: 'Mechanical & Plant Works'     },
  { value: 'it',             label: 'IT & Software'                },
  { value: 'supply',         label: 'Goods / Supply'               },
  { value: 'consulting',     label: 'Consulting & Advisory'        },
  { value: 'printing',       label: 'Printing & Stationery'        },
  { value: 'transport',      label: 'Transport & Logistics'        },
  { value: 'horticulture',   label: 'Horticulture & Landscaping'   },
  { value: 'security',       label: 'Security Services'            },
  { value: 'housekeeping',   label: 'Housekeeping & Sanitation'    },
  { value: 'other',          label: 'Other'                        },
]

// ── Validation ────────────────────────────────────────────────────────────────
// Step-0 "details" form schema. Base fields (role/email/password) are always
// required; role-specific fields are optional at the object level — their
// real requirement rules run conditionally in the superRefine() below, which
// also runs format checks (GSTIN/PAN/Aadhar/URL regexes).
const detailsSchema = z.object({
  role: z.enum(['seeker', 'company', 'store', 'contractor']), // which account type is being created
  email:    z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // Company fields (role === 'company')
  company_name: z.string().optional(),

  // Shared verification ID fields — used by company, store, and contractor roles
  gstin:          z.string().optional(), // 15-char GST Identification Number
  pan_number:     z.string().optional(), // 10-char Permanent Account Number
  aadhar_number:  z.string().optional(), // 12-digit Aadhar UID

  // Store fields (role === 'store')
  store_type:         z.enum(['online', 'retail']).optional(), // chosen inside the Store block via toggle
  store_name:         z.string().optional(),
  store_category:     z.string().optional(),
  store_url:          z.string().optional(), // brand/store website; required for both sub-types
  store_locator_url:  z.string().optional(), // branch-locator page; only relevant for retail sub-type

  // Contractor fields (role === 'contractor')
  contractor_name:     z.string().optional(), // registered firm / trade name
  contractor_category: z.string().optional(), // primary work category
  gem_id:              z.string().optional(),  // Government e-Marketplace Seller ID (optional)
}).superRefine((data, ctx) => {
  // ── Company ───────────────────────────────────────────────────────────────
  // Name is required; at least one of GSTIN/PAN/Aadhar must be supplied and
  // each is format-checked only when a value is actually entered.
  if (data.role === 'company') {
    if (!data.company_name?.trim()) {
      ctx.addIssue({ path: ['company_name'], code: z.ZodIssueCode.custom, message: 'Company name is required' })
    }
    const hasId = data.gstin?.trim() || data.pan_number?.trim() || data.aadhar_number?.trim()
    if (!hasId) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Provide at least one verification ID' })
    }
    // GSTIN: 2-digit state code + 10-char PAN + entity code + 'Z' + checksum
    if (data.gstin?.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(data.gstin.trim())) {
      ctx.addIssue({ path: ['gstin'], code: z.ZodIssueCode.custom, message: 'Enter a valid 15-character GSTIN' })
    }
    // PAN: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
    if (data.pan_number?.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(data.pan_number.trim())) {
      ctx.addIssue({ path: ['pan_number'], code: z.ZodIssueCode.custom, message: 'Enter a valid 10-character PAN (e.g. ABCDE1234F)' })
    }
    // Aadhar: exactly 12 digits
    if (data.aadhar_number?.trim() && !/^[0-9]{12}$/.test(data.aadhar_number.trim())) {
      ctx.addIssue({ path: ['aadhar_number'], code: z.ZodIssueCode.custom, message: 'Aadhar must be exactly 12 digits' })
    }
  }

  // ── Store (online or retail) ───────────────────────────────────────────────
  // Sub-type must be selected; name and website URL are required regardless
  // of sub-type; store_locator_url is optional (retail only) but still URL-
  // validated when provided; at least one verification ID is required.
  if (data.role === 'store') {
    if (!data.store_type) {
      ctx.addIssue({ path: ['store_type'], code: z.ZodIssueCode.custom, message: 'Select Online or Retail' })
    }
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

  // ── Contractor ────────────────────────────────────────────────────────────
  // Firm name is required; at least one verification ID must be supplied
  // (same format checks as company/store above).
  if (data.role === 'contractor') {
    if (!data.contractor_name?.trim()) {
      ctx.addIssue({ path: ['contractor_name'], code: z.ZodIssueCode.custom, message: 'Firm / trade name is required' })
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

  const [step, setStep] = useState(0)           // 0 = details form, 1 = OTP verification form
  const [savedData, setSavedData] = useState(null) // details form values, kept around to submit alongside the verified OTP
  const [error, setError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0) // seconds remaining before "Resend OTP" is clickable again

  const initialRole = ['seeker', 'company', 'store', 'contractor'].includes(state?.role) ? state.role : 'seeker'

  // Step-0 form: role + account details, validated against detailsSchema
  const detailsForm = useForm({
    resolver: zodResolver(detailsSchema),
    defaultValues: { role: initialRole },
  })
  const role      = detailsForm.watch('role')       // re-renders role-specific field sections as the user switches tiles
  const storeType = detailsForm.watch('store_type') // drives Online/Retail toggle and conditional fields within Store block

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
  // role-derived flags (is_company/is_store_owner/is_contractor/is_job_seeker,
  // store_type) and the verified_token proving the email was confirmed.
  const onVerifyOtp = async ({ otp }) => {
    try {
      setError('')
      const { data: tokenData } = await authService.verifyOtp(savedData.email, otp)
      await registerUser({
        ...savedData,
        is_company:     savedData.role === 'company',
        is_store_owner: savedData.role === 'store',
        is_contractor:  savedData.role === 'contractor',
        is_job_seeker:  savedData.role === 'seeker',
        // store_type comes from the inline toggle within the Store block;
        // defaults to 'online' as a safety fallback for non-store roles.
        store_type: savedData.role === 'store' ? (savedData.store_type || 'online') : undefined,
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
                  drives which extra field block renders below */}
              <div>
                <p className="text-sm font-medium mb-2">I am registering as</p>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map(({ id, label, icon: Icon }) => {
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

              {/* Company fields — only rendered when role === 'company' */}
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

              {/* Store fields — rendered when role === 'store'.
                  An Online/Retail toggle at the top drives which category list
                  and which optional fields (store_locator_url) are shown. */}
              {role === 'store' && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Store Details</p>

                  {/* Online / Retail sub-type toggle */}
                  <div>
                    <label className="text-sm font-medium">Store Type <span className="text-destructive">*</span></label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {[
                        { value: 'online', label: 'Online Store',  hint: 'e-commerce / website' },
                        { value: 'retail', label: 'Retail / Chain', hint: 'physical stores'      },
                      ].map(({ value, label, hint }) => {
                        const active = storeType === value
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              detailsForm.setValue('store_type', value)
                              // Reset category whenever sub-type changes to avoid
                              // carrying over a value from the wrong category list.
                              detailsForm.setValue('store_category', '')
                            }}
                            className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg border-2 text-center transition-all ${
                              active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            <span className="text-xs font-semibold">{label}</span>
                            <span className="text-[10px] opacity-70">{hint}</span>
                          </button>
                        )
                      })}
                    </div>
                    {detailsForm.formState.errors.store_type && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_type.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {storeType === 'retail' ? 'Brand / Chain Name' : 'Store Name'}{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...detailsForm.register('store_name')}
                      placeholder={storeType === 'retail' ? 'e.g. Reliance Fresh' : 'My Awesome Store'}
                      className="mt-1"
                    />
                    {detailsForm.formState.errors.store_name && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_name.message}</p>
                    )}
                  </div>

                  {/* Category list changes based on the chosen sub-type */}
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      {...detailsForm.register('store_category')}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a category</option>
                      {(storeType === 'retail' ? RETAIL_CATEGORIES : STORE_CATEGORIES).map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      {storeType === 'retail' ? 'Brand Website URL' : 'Store Website URL'}{' '}
                      <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...detailsForm.register('store_url')}
                      placeholder={storeType === 'retail' ? 'https://reliancefresh.in' : 'https://mystore.com'}
                      type="url"
                      className="mt-1"
                    />
                    {detailsForm.formState.errors.store_url && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_url.message}</p>
                    )}
                  </div>

                  {/* Store locator URL is only meaningful for retail chains */}
                  {storeType === 'retail' && (
                    <div>
                      <label className="text-sm font-medium">Store Locator URL <span className="text-muted-foreground text-xs">(optional)</span></label>
                      <Input {...detailsForm.register('store_locator_url')} placeholder="https://reliancefresh.in/stores" type="url" className="mt-1" />
                      <p className="text-xs text-muted-foreground mt-1">Link to your store finder / branch locator page</p>
                      {detailsForm.formState.errors.store_locator_url && (
                        <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.store_locator_url.message}</p>
                      )}
                    </div>
                  )}

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

                  <p className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">
                    Store listing is free for now — paid plans are coming soon.
                  </p>
                </div>
              )}

              {/* Contractor fields — only rendered when role === 'contractor' */}
              {role === 'contractor' && (
                <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm font-semibold">Contractor Details</p>

                  <div>
                    <label className="text-sm font-medium">Firm / Trade Name <span className="text-destructive">*</span></label>
                    <Input {...detailsForm.register('contractor_name')} placeholder="e.g. Sharma Constructions Pvt. Ltd." className="mt-1" />
                    {detailsForm.formState.errors.contractor_name && (
                      <p className="text-xs text-destructive mt-1">{detailsForm.formState.errors.contractor_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Primary Work Category</label>
                    <select
                      {...detailsForm.register('contractor_category')}
                      className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select a category</option>
                      {CONTRACTOR_CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">GeM Seller ID <span className="text-xs text-muted-foreground">(optional)</span></label>
                    <Input {...detailsForm.register('gem_id')} placeholder="e.g. GEM-1-2024-XXXXXXX" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Government e-Marketplace seller ID, if registered</p>
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
                    <label className="text-sm font-medium">PAN <span className="text-xs text-muted-foreground">(Firm or Personal)</span></label>
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

                  <p className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2">
                    As a contractor you can save tenders, set keyword alerts, and get notified about new tenders matching your work category — free to use.
                  </p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={detailsForm.formState.isSubmitting}>
                {detailsForm.formState.isSubmitting ? 'Sending OTP...' : 'Continue'}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" state={state} className="text-primary hover:underline font-medium">Sign in</Link>
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
