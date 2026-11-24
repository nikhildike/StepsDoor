/**
 * LatestTenders.test.jsx — the scraped-tender list on /tenders: members-only
 * gating, rendering of API rows, filters passed to the API, and the Tenders
 * page defaulting members to this view (contractors land on /tenders after login).
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/tenderService', () => ({
  tenderService: {
    list: vi.fn(() => Promise.resolve({
      data: {
        count: 1,
        results: [{
          id: 564, title: 'Police Bungalow Campus Phase V', organisation: 'Guwahati Metropolitan Development Authority',
          state: 'Assam', district: 'Guwahati', category: 'civil', estimated_value: '452119000.00',
          submission_deadline: '2026-12-15T06:30:00Z',
        }],
      },
    })),
    states: vi.fn(() => Promise.resolve({ data: [{ state: 'Assam', count: 12 }] })),
  },
}))

import { tenderService } from '@/services/tenderService'
import { useAuthStore } from '@/store/authStore'
import { LatestTenders } from './LatestTenders'
import Tenders from '@/pages/public/Tenders'

function renderInRouter(ui, url = '/tenders') {
  return render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>)
}

// Shows the router's current URL so tests can assert on ?search= syncing.
function LocationProbe() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname + location.search}</p>
}

describe('LatestTenders', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows guests the sign-in prompt without calling the API', () => {
    useAuthStore.setState({ token: null, user: null })
    renderInRouter(<LatestTenders />)
    expect(screen.getByText('Free for members')).toBeInTheDocument()
    expect(tenderService.list).not.toHaveBeenCalled()
  })

  it('lists tenders for members with value, location and link', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    renderInRouter(<LatestTenders />)
    const link = await screen.findByRole('link', { name: /Police Bungalow Campus Phase V/ })
    expect(link).toHaveAttribute('href', '/tenders/564')
    expect(screen.getByText('Guwahati, Assam')).toBeInTheDocument()
    expect(screen.getByText(/45,21,19,000/)).toBeInTheDocument() // Indian grouping
    expect(screen.getByText('1 open tender')).toBeInTheDocument()
  })

  it('passes filters and sort to the API', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    renderInRouter(<LatestTenders />)
    await screen.findByRole('option', { name: 'Assam (12)' })
    await userEvent.selectOptions(screen.getByLabelText('State'), 'Assam')
    await userEvent.selectOptions(screen.getByLabelText('Sort'), 'submission_deadline')
    await waitFor(() => expect(tenderService.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'Assam', ordering: 'submission_deadline', page: 1 }),
    ))
  })
})

describe('LatestTenders search in the URL', () => {
  beforeEach(() => vi.clearAllMocks())

  it('applies ?search= from the URL on arrival (Home hero search, navbar "See all")', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    renderInRouter(<LatestTenders />, '/tenders?search=road')
    expect(screen.getByRole('searchbox')).toHaveValue('road')
    await waitFor(() => expect(tenderService.list).toHaveBeenCalled())
    expect(tenderService.list.mock.calls[0][0]).toEqual(expect.objectContaining({ search: 'road' }))
  })

  it('typing a keyword searches and updates the URL', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    render(
      <MemoryRouter initialEntries={['/tenders']}>
        <Routes><Route path="/tenders" element={<><LatestTenders /><LocationProbe /></>} /></Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByRole('searchbox'), 'bridge')
    await waitFor(() => expect(tenderService.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'bridge', page: 1 })))
    expect(screen.getByTestId('location')).toHaveTextContent('/tenders?search=bridge')
  })
})

describe('Tenders page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens on the scraped list for members and on the portal directory for guests', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    const { unmount } = renderInRouter(<Tenders />)
    expect(screen.getByRole('tab', { name: 'Latest tenders' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByText('Police Bungalow Campus Phase V')
    unmount()

    useAuthStore.setState({ token: null, user: null })
    renderInRouter(<Tenders />)
    expect(screen.getByRole('tab', { name: 'Official portals' })).toHaveAttribute('aria-selected', 'true')
    expect(tenderService.list).toHaveBeenCalledTimes(1) // only the member render fetched
  })
})
