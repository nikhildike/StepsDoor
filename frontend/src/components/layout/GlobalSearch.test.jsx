/**
 * GlobalSearch.test.jsx — the navbar search box searches scraped tenders for
 * members (with a "See all" link to /tenders?search=…), never for guests, and
 * Enter takes contractors to the filtered tender list.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/tenderService', () => ({
  tenderService: {
    list: vi.fn(() => Promise.resolve({
      data: { count: 43, results: [{ id: 5, title: 'Road repair Ward 8', organisation: 'MC Karnal', state: 'Haryana' }] },
    })),
  },
}))
vi.mock('@/services/jobService', () => ({ jobService: { list: vi.fn(() => Promise.resolve({ data: { results: [] } })) } }))
vi.mock('@/services/companyService', () => ({ companyService: { list: vi.fn(() => Promise.resolve({ data: [] })) } }))

import { tenderService } from '@/services/tenderService'
import { useAuthStore } from '@/store/authStore'
import GlobalSearch from './GlobalSearch'

// Shows the router's current URL so tests can assert where Enter / "See all" navigated.
function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <GlobalSearch />
      <Routes><Route path="*" element={<LocationProbe />} /></Routes>
    </MemoryRouter>,
  )
}

describe('GlobalSearch tenders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows scraped tender matches to members with a See all link', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    renderSearch()
    await userEvent.type(screen.getByPlaceholderText('Search everything...'), 'road')
    const result = await screen.findByRole('link', { name: /Road repair Ward 8/ })
    expect(result).toHaveAttribute('href', '/tenders/5')
    expect(tenderService.list).toHaveBeenLastCalledWith({ search: 'road', page_size: 4 })

    await userEvent.click(screen.getByRole('button', { name: /See all 43 tenders/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/tenders?search=road')
  })

  it('never searches tenders for guests', async () => {
    useAuthStore.setState({ token: null, user: null })
    renderSearch()
    await userEvent.type(screen.getByPlaceholderText('Search everything...'), 'road')
    await new Promise(r => setTimeout(r, 400)) // past the 300 ms debounce
    expect(tenderService.list).not.toHaveBeenCalled()
  })

  it('Enter takes a contractor to the filtered tender list', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    renderSearch()
    await userEvent.type(screen.getByPlaceholderText('Search everything...'), 'bridge{Enter}')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tenders?search=bridge'))
  })
})
