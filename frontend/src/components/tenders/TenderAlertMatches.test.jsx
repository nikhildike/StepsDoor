/**
 * TenderAlertMatches.test.jsx — saving tenders and tender alerts on the web:
 * tenders matching each alert (Alerts page), keyword suggestions from tender
 * titles, the Saved Tenders page, the tender page's Save button, and the
 * contractor dashboard's real stat cards.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const ROAD = {
  id: 7, title: 'Road construction Sector 12', organisation: 'PWD B&R Karnal', state: 'Haryana', district: 'Karnal',
  category: 'works', estimated_value: '9000000.00', submission_deadline: new Date(Date.now() + 2 * 86400000).toISOString(),
  source_url: 'https://etenders.hry.nic.in/nicgep/app', source_portal: 'etenders.hry.nic.in',
}
const DRAIN = { ...ROAD, id: 8, title: 'Storm water drain cleaning', state: 'Punjab' }

vi.mock('@/services/tenderService', () => ({
  tenderService: {
    alerts: vi.fn(() => Promise.resolve({ data: [{ id: 3, keyword: 'road', state: '', category: '', min_value: null, is_active: true }] })),
    createAlert: vi.fn((data) => Promise.resolve({ data: { id: 4, ...data } })),
    alertMatches: vi.fn(() => Promise.resolve({ data: { count: 1, results: [ROAD] } })),
    allAlertMatches: vi.fn(() => Promise.resolve({ data: { count: 1, results: [ROAD] } })),
    keywordSuggestions: vi.fn(() => Promise.resolve({ data: [{ keyword: 'Road construction', count: 12 }, { keyword: 'Road repair', count: 5 }] })),
    saved: vi.fn(),
    save: vi.fn(() => Promise.resolve({ data: { id: 91 } })),
    unsave: vi.fn(() => Promise.resolve({})),
    stats: vi.fn(() => Promise.resolve({ data: { saved_tenders: 2, active_alerts: 1, alert_matches: 14, new_today: 37, open_tenders: 412 } })),
    list: vi.fn(() => Promise.resolve({ data: { results: [] } })),
    get: vi.fn(() => Promise.resolve({ data: ROAD })),
  },
}))
vi.mock('@/services/seekerService', () => ({
  seekerService: {
    profile: vi.fn(() => Promise.resolve({ data: { first_name: 'Ravi' } })),
    savedJobs: vi.fn(() => Promise.resolve({ data: [] })),
    alerts: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))

import { tenderService } from '@/services/tenderService'
import { useAuthStore } from '@/store/authStore'
import { tenderMatchSummary } from './TenderAlertMatches'
import Alerts from '@/pages/seeker/Alerts'
import SavedTenders from '@/pages/seeker/SavedTenders'
import SeekerOverview from '@/pages/seeker/Overview'
import TenderDetail from '@/pages/public/TenderDetail'

const contractor = { is_contractor: true, first_name: 'Ravi' }

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: 'jwt', user: contractor })
  tenderService.saved.mockResolvedValue({ data: [] })
})

describe('Tender alerts', () => {
  it('summarises the number of matches', () => {
    expect(tenderMatchSummary(14)).toBe('14 open tenders match')
    expect(tenderMatchSummary(0)).toBe('No open tenders match yet')
  })

  it('lists matching tenders under each alert, with a save toggle', async () => {
    render(<MemoryRouter><Alerts /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /1 open tender match/ }))
    expect(screen.getByText('Road construction Sector 12')).toBeInTheDocument()
    expect(tenderService.alertMatches).toHaveBeenCalledWith(3, { limit: 20 })
    await userEvent.click(screen.getByRole('button', { name: 'Save tender' }))
    expect(tenderService.save).toHaveBeenCalledWith(7)
  })

  it('suggests keywords from tender titles and saves the picked one', async () => {
    render(<MemoryRouter><Alerts /></MemoryRouter>)
    await userEvent.click(await screen.findByRole('button', { name: /New Alert/ }))
    await userEvent.type(screen.getByLabelText('Keyword'), 'road')
    expect(await screen.findByText('12 tenders')).toBeInTheDocument()
    expect(tenderService.keywordSuggestions).toHaveBeenLastCalledWith('road')
    await userEvent.click(screen.getByRole('option', { name: /Road repair/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create Alert' }))
    await waitFor(() => expect(tenderService.createAlert).toHaveBeenCalled())
    expect(tenderService.createAlert.mock.calls[0][0].keyword).toBe('Road repair')
  })
})

describe('Saved Tenders page', () => {
  it('lists saved tenders, marks closed ones, and removes one', async () => {
    tenderService.saved.mockResolvedValue({ data: [
      { id: 1, tender: 7, is_open: true, details: ROAD },
      { id: 2, tender: 8, is_open: false, details: DRAIN },
    ] })
    render(<MemoryRouter><SavedTenders /></MemoryRouter>)
    expect(await screen.findByText('Road construction Sector 12')).toBeInTheDocument()
    expect(screen.getByText('2 saved tenders')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Road construction/ })).toHaveAttribute('href', '/seeker/tenders/7')
    await userEvent.click(screen.getAllByRole('button', { name: 'Remove from saved' })[0])
    expect(tenderService.unsave).toHaveBeenCalledWith(1)
    await waitFor(() => expect(screen.queryByText('Road construction Sector 12')).toBeNull())
  })
})

describe('Tender page', () => {
  it('has a Save tender button that toggles', async () => {
    render(
      <MemoryRouter initialEntries={['/tenders/7']}>
        <Routes><Route path="/tenders/:id" element={<TenderDetail />} /></Routes>
      </MemoryRouter>,
    )
    await userEvent.click(await screen.findByRole('button', { name: /Save tender/ }))
    expect(tenderService.save).toHaveBeenCalledWith(7)
    expect(await screen.findByRole('button', { name: /Saved/ })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Contractor dashboard', () => {
  it('shows real counts linked to their pages and the tenders matching alerts', async () => {
    render(<MemoryRouter><SeekerOverview /></MemoryRouter>)
    const today = await screen.findByRole('link', { name: /New Today/ })
    expect(within(today).getByText('37')).toBeInTheDocument()
    const saved = screen.getByRole('link', { name: /Saved Tenders/ })
    expect(saved).toHaveAttribute('href', '/seeker/saved-tenders')
    expect(within(screen.getByRole('link', { name: /Tender Alerts/ })).getByText('14 matching open tenders')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Open Tenders/ })).getByText('412')).toBeInTheDocument()
    expect(await screen.findByText('Road construction Sector 12')).toBeInTheDocument()
    expect(tenderService.allAlertMatches).toHaveBeenCalledWith({ limit: 5 })
  })
})
