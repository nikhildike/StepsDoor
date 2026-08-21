/**
 * Store Profile page.
 *
 * Route: `/store/profile` (nested under the store owner account layout).
 * Access: store owner accounts only — companion to the backend `stores` app.
 *
 * Lets a store owner edit their store's public listing details (name,
 * category, website, optional store-locator link for retail chains, tagline,
 * description, contact phone). The available category list and some field
 * labels switch depending on whether the store is `online` or `retail`.
 */
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { storeService } from '@/services/storeService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

// Category options shown when the store's type is "online" (e-commerce / D2C brands).
const ONLINE_CATEGORIES = [
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

// Category options shown when the store's type is "retail" (physical/chain stores).
const RETAIL_CATEGORIES = [
  { value: 'supermarkets', label: 'Supermarkets & Hypermarkets' },
  { value: 'department',   label: 'Department Stores'           },
  { value: 'electronics',  label: 'Electronics & Mobiles'       },
  { value: 'jewellery',    label: 'Jewellery'                   },
  { value: 'pharmacy',     label: 'Pharmacy & Health'           },
  { value: 'beauty',       label: 'Beauty & Personal Care'      },
  { value: 'footwear',     label: 'Footwear'                    },
  { value: 'sports',       label: 'Sports & Fitness'            },
  { value: 'home',         label: 'Home & Furniture'            },
  { value: 'books',        label: 'Books & Stationery'          },
  { value: 'food_qsr',     label: 'Food & QSR Chains'          },
  { value: 'auto',         label: 'Auto & Accessories'          },
  { value: 'other',        label: 'Other'                       },
]

// Zod validation schema for the store profile form.
// - name/category/website_url: required.
// - store_locator_url: optional, but if provided must be a valid URL (empty string allowed).
// - tagline: optional, capped at 255 chars.
// - description/contact_phone/shopping_links/offers_links: optional free text.
const schema = z.object({
  name:              z.string().min(2, 'Store name is required'),
  category:          z.string().min(1, 'Select a category'),
  website_url:       z.string().url('Enter a valid URL'),
  store_locator_url: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
  tagline:           z.string().max(255).optional(),
  description:       z.string().optional(),
  contact_phone:     z.string().optional(),
  shopping_links:    z.string().optional(), // one URL per line, shown on the shopping directory
  offers_links:      z.string().optional(), // one URL per line, shown in the Special Offers modal
})

/**
 * Renders the store owner's editable store listing form. Category options and
 * some labels/fields adapt based on the store's `store_type` (online vs retail).
 */
export default function StoreProfile() {
  // Whether the "Changes saved" confirmation should currently be shown.
  const [saved, setSaved] = useState(false)
  // Error message shown when saving the profile fails.
  const [error, setError] = useState('')
  // Store type ('online' or 'retail'), fetched from the backend; drives which
  // category list and labels (e.g. "Store Locator URL") are shown.
  const [storeType, setStoreType] = useState('online')

  // React Hook Form wiring: register() binds inputs, reset() populates the form
  // once store data loads.
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  // Fetches the store owner's current store profile on mount, records its store_type,
  // and populates the form via reset() (normalizing missing fields to empty strings/defaults).
  // GET /stores/me/ (stores app).
  useEffect(() => {
    storeService.getMe().then(({ data }) => {
      setStoreType(data.store_type || 'online')
      reset({
        name:              data.name              || '',
        category:          data.category          || 'other',
        website_url:       data.website_url       || '',
        store_locator_url: data.store_locator_url || '',
        tagline:           data.tagline           || '',
        description:       data.description       || '',
        contact_phone:     data.contact_phone     || '',
        shopping_links:    data.shopping_links    || '',
        offers_links:      data.offers_links      || '',
      })
    }).catch(() => {})
  }, [reset])

  // Picks the category option list to render in the <select> based on the store's type.
  const categories = storeType === 'retail' ? RETAIL_CATEGORIES : ONLINE_CATEGORIES

  // Form submit handler: fires when the store profile form passes Zod validation and is submitted.
  // Saves the updated fields and shows a temporary success message; on failure, surfaces
  // the first validation/API error message returned by the backend.
  // PATCH /stores/me/ (stores app).
  const onSubmit = async (data) => {
    try {
      setError('')
      await storeService.update(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      const detail = err?.response?.data
      if (typeof detail === 'object') {
        const first = Object.values(detail).flat()[0]
        setError(typeof first === 'string' ? first : 'Could not save changes.')
      } else {
        setError('Could not save changes.')
      }
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Store Profile</h1>
        {/* Text adapts based on store type since online vs retail stores appear on different public pages. */}
        <p className="text-muted-foreground text-sm mt-1">
          This information appears on the {storeType === 'retail' ? 'Retail Stores' : 'Shopping'} page
        </p>
      </div>

      {/* Error banner for save failures. */}
      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {/* Temporary success confirmation after a successful save (auto-hides after 2.5s). */}
      {saved && <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">Changes saved.</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Store Name</label>
          <Input {...register('name')} className="mt-1" />
          {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <select
            {...register('category')}
            className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {/* Renders options from ONLINE_CATEGORIES or RETAIL_CATEGORIES depending on storeType. */}
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>

        <div>
          {/* Label wording differs for retail chains ("Brand Website") vs online stores ("Website"). */}
          <label className="text-sm font-medium">
            {storeType === 'retail' ? 'Brand Website URL' : 'Website URL'}
          </label>
          <Input {...register('website_url')} type="url" placeholder="https://mystore.com" className="mt-1" />
          {errors.website_url && <p className="text-xs text-destructive mt-1">{errors.website_url.message}</p>}
        </div>

        {/* Store locator field only makes sense for retail chains with physical branches. */}
        {storeType === 'retail' && (
          <div>
            <label className="text-sm font-medium">
              Store Locator URL <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Input {...register('store_locator_url')} type="url" placeholder="https://mychain.in/stores" className="mt-1" />
            <p className="text-xs text-muted-foreground mt-1">Link to your branch finder or Google Maps listing</p>
            {errors.store_locator_url && <p className="text-xs text-destructive mt-1">{errors.store_locator_url.message}</p>}
          </div>
        )}

        <div>
          <label className="text-sm font-medium">Tagline <span className="text-muted-foreground text-xs">(optional)</span></label>
          <Input {...register('tagline')} placeholder="e.g. India's best ethnic wear" className="mt-1" />
        </div>

        <div>
          <label className="text-sm font-medium">Description <span className="text-muted-foreground text-xs">(optional)</span></label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Briefly describe your store..."
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Contact Phone <span className="text-muted-foreground text-xs">(optional)</span></label>
          <Input {...register('contact_phone')} placeholder="+91 98765 43210" className="mt-1" />
        </div>

        {/* shopping_links: direct product/category links shown on the shopping directory alongside the store card. */}
        <div>
          <label className="text-sm font-medium">
            Shopping Links <span className="text-muted-foreground text-xs">(optional — one URL per line)</span>
          </label>
          <textarea
            {...register('shopping_links')}
            rows={4}
            placeholder={"https://mystore.com/shoes\nhttps://mystore.com/sale"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Direct product or category links shown on the {storeType === 'retail' ? 'Retail Stores' : 'Shopping'} directory.
          </p>
        </div>

        {/* offers_links: deal/sale/coupon URLs shown in the Special Offers modal on the shopping pages. */}
        <div>
          <label className="text-sm font-medium">
            Offers Links <span className="text-muted-foreground text-xs">(optional — one URL per line)</span>
          </label>
          <textarea
            {...register('offers_links')}
            rows={4}
            placeholder={"https://mystore.com/sale\nhttps://mystore.com/coupon"}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-mono"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Deal, sale, or coupon links shown in the Special Offers pop-up on the shopping pages.
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
