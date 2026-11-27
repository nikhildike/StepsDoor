/**
 * DashboardLayout.test.jsx — the company dashboard's Shopping, Retail Stores and
 * Services links open those pages inside the dashboard (/dashboard/...), so the
 * company keeps its sidebar instead of landing on the public site.
 * Also: store owners keep one sidebar across /dashboard and /store.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/storeService', () => ({
  storeService: {
    list: vi.fn(() => Promise.resolve({ data: [] })),
    listRetail: vi.fn(() => Promise.resolve({ data: [] })),
    listFeaturedLinks: vi.fn(() => Promise.resolve({ data: [] })),
    click: vi.fn(() => Promise.resolve({})),
  },
}))

import { useAuthStore } from '@/store/authStore'
import DashboardLayout from './DashboardLayout'
import Shopping from '@/pages/public/Shopping'
import RetailStores from '@/pages/public/RetailStores'
import Services from '@/pages/public/Services'

/** Shows the current path so the test can check where a click went. */
function Where() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

/** The company dashboard with the three browse pages mounted as in App.jsx. */
function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<p>Company home</p>} />
          <Route path="shopping" element={<Shopping />} />
          <Route path="retail-stores" element={<RetailStores />} />
          <Route path="services" element={<Services />} />
        </Route>
        <Route path="*" element={<p>Left the dashboard</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: 'jwt', user: { is_company: true, first_name: 'Acme' } })
})

describe('company dashboard browse links', () => {
  it.each([
    ['Shopping', '/dashboard/shopping'],
    ['Retail Stores', '/dashboard/retail-stores'],
    ['Services', '/dashboard/services'],
  ])('%s opens inside the dashboard', async (label, path) => {
    renderDashboard()
    const [link] = screen.getAllByRole('link', { name: label })
    expect(link).toHaveAttribute('href', path)
    await userEvent.click(link)
    expect(screen.getByTestId('path')).toHaveTextContent(path)
    expect(screen.queryByText('Left the dashboard')).toBeNull()
    // Still in the dashboard: its own nav is on screen next to the page.
    expect(screen.getAllByRole('link', { name: 'Manage Jobs' }).length).toBeGreaterThan(0)
  })
})

/**
 * Store owners (always company accounts too) get one sidebar for /dashboard/* and
 * /store/*: moving between the two keeps every button, where separate layouts used
 * to swap the sidebar on "My Store".
 */
describe('store owner sidebar', () => {
  /** Both sections mounted under DashboardLayout, as in App.jsx. */
  function renderBoth(start) {
    return render(
      <MemoryRouter initialEntries={[start]}>
        <Routes>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<p>Company home</p>} />
          </Route>
          <Route path="/store" element={<DashboardLayout />}>
            <Route index element={<p>Store home</p>} />
            <Route path="profile" element={<p>Store profile page</p>} />
          </Route>
        </Routes>
        <Where />
      </MemoryRouter>,
    )
  }

  // Every sidebar button a store owner should always see.
  const ALL_LINKS = [
    'Dashboard', 'Post a Job', 'Manage Jobs', 'Analytics', 'Subscription', 'Invoices',
    'Company Profile', 'Store Overview', 'Store Profile', 'Store Subscription', 'My Account',
    'Shopping', 'Retail Stores', 'Services',
  ]

  /** Fails unless each expected button is in the sidebar. */
  function expectAllLinks() {
    for (const name of ALL_LINKS) {
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0)
    }
  }

  beforeEach(() => {
    useAuthStore.setState({ token: 'jwt', user: { is_company: true, is_store_owner: true, first_name: 'Asha' } })
  })

  it('keeps every button when going from the company dashboard to the store', async () => {
    renderBoth('/dashboard')
    expectAllLinks()
    await userEvent.click(screen.getAllByRole('link', { name: 'Store Overview' })[0])
    expect(screen.getByText('Store home')).toBeInTheDocument()
    expectAllLinks()
    await userEvent.click(screen.getAllByRole('link', { name: 'Store Profile' })[0])
    expect(screen.getByTestId('path')).toHaveTextContent('/store/profile')
    expectAllLinks()
  })

  it('keeps every button when going from the store back to job pages', async () => {
    renderBoth('/store')
    await userEvent.click(screen.getAllByRole('link', { name: 'Dashboard' })[0])
    expect(screen.getByText('Company home')).toBeInTheDocument()
    expectAllLinks()
  })

  it('hides the My Store group from companies without a store', () => {
    useAuthStore.setState({ token: 'jwt', user: { is_company: true, first_name: 'Acme' } })
    renderBoth('/dashboard')
    expect(screen.queryByRole('link', { name: 'Store Overview' })).toBeNull()
  })
})
