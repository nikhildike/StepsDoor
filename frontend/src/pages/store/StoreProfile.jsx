import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { storeService } from '@/services/storeService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

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

const schema = z.object({
  name:              z.string().min(2, 'Store name is required'),
  category:          z.string().min(1, 'Select a category'),
  website_url:       z.string().url('Enter a valid URL'),
  store_locator_url: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
  tagline:           z.string().max(255).optional(),
  description:       z.string().optional(),
  contact_phone:     z.string().optional(),
})

export default function StoreProfile() {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [storeType, setStoreType] = useState('online')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

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
      })
    }).catch(() => {})
  }, [reset])

  const categories = storeType === 'retail' ? RETAIL_CATEGORIES : ONLINE_CATEGORIES

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
        <p className="text-muted-foreground text-sm mt-1">
          This information appears on the {storeType === 'retail' ? 'Retail Stores' : 'Shopping'} page
        </p>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
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
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>

        <div>
          <label className="text-sm font-medium">
            {storeType === 'retail' ? 'Brand Website URL' : 'Website URL'}
          </label>
          <Input {...register('website_url')} type="url" placeholder="https://mystore.com" className="mt-1" />
          {errors.website_url && <p className="text-xs text-destructive mt-1">{errors.website_url.message}</p>}
        </div>

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

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </div>
  )
}
