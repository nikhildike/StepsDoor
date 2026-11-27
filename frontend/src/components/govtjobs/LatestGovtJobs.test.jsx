/**
 * LatestGovtJobs.test.jsx — the scraped govt-job list on /govt-jobs (and in the
 * student dashboard at /seeker/govt-jobs): members-only gating, the useful card
 * facts and actions, dashboard-relative links, the page's default tab, and the
 * dashboard's "Govt jobs closing soon" card.
 */
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const soon = new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString()
const JOBS = [
  {
    id: 8, title: 'RRB CEN 08/2026 — STATION MASTER', organisation: 'Railway Recruitment Boards (RRB)',
    category: 'railway', state: 'Central Govt', vacancy_count: 6235, qualification: 'Graduate',
    application_deadline: soon, published_at: '2026-10-26T00:00:00Z',
    source_url: 'https://www.rrbapply.gov.in/', notification_pdf_url: 'https://rrb.example/cen-08-2026.pdf',
  },
  {
    id: 9, title: 'UPSC Recruitment Advertisement No. 13/2026 (multiple posts)', organisation: 'UPSC',
    category: 'civil_services', state: 'Central Govt', vacancy_count: null, qualification: '',
    application_deadline: null, published_at: '2026-11-13T00:00:00Z',
    source_url: 'https://upsc.gov.in/advertisements/', notification_pdf_url: '',
  },
]

vi.mock('@/services/govtJobService', () => ({
  govtJobService: {
    list: vi.fn(() => Promise.resolve({ data: { count: 2, results: JOBS } })),
    states: vi.fn(() => Promise.resolve({ data: [{ state: 'Central Govt', count: 2 }] })),
  },
}))
vi.mock('@/services/seekerService', () => ({
  seekerService: {
    profile: vi.fn(() => Promise.resolve({ data: { first_name: 'Asha' } })),
    savedJobs: vi.fn(() => Promise.resolve({ data: [] })),
    alerts: vi.fn(() => Promise.resolve({ data: [] })),
    stats: vi.fn(() => Promise.resolve({ data: { saved_jobs: 0, active_alerts: 0, alert_matches: 0, new_jobs_today: { total: 0, job: 0, company: 0, govt: 0 } } })),
    allAlertMatches: vi.fn(() => Promise.resolve({ data: { count: 0, counts: {}, results: [] } })),
  },
}))
vi.mock('@/services/jobService', () => ({ jobService: { list: vi.fn(() => Promise.reject(new Error('jobs down'))) } }))

import { govtJobService } from '@/services/govtJobService'
import { useAuthStore } from '@/store/authStore'
import { LatestGovtJobs } from './LatestGovtJobs'
import GovtJobs from '@/pages/public/GovtJobs'
import Overview from '@/pages/seeker/Overview'

function renderAt(url, ui) {
  return render(<MemoryRouter initialEntries={[url]}>{ui}</MemoryRouter>)
}

describe('LatestGovtJobs', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows guests the sign-in prompt without calling the API', () => {
    useAuthStore.setState({ token: null, user: null })
    renderAt('/govt-jobs', <LatestGovtJobs />)
    expect(screen.getByText('Free for members')).toBeInTheDocument()
    expect(govtJobService.list).not.toHaveBeenCalled()
  })

  it('shows deadline, vacancies and the apply-side actions', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderAt('/govt-jobs', <LatestGovtJobs />)
    const title = await screen.findByRole('link', { name: /STATION MASTER/ })
    expect(title).toHaveAttribute('href', '/govt-jobs/8')
    expect(screen.getByText('Closes in 2 days')).toBeInTheDocument()
    expect(screen.getByText('6,235 vacancies')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Notification PDF/ })).toHaveAttribute('href', 'https://rrb.example/cen-08-2026.pdf')
    expect(screen.getAllByRole('link', { name: /Official site/ })[0]).toHaveAttribute('href', 'https://www.rrbapply.gov.in/')
    expect(screen.getByText(/closing date in notification/)).toBeInTheDocument() // the undated advertisement
  })

  it('links stay inside the student dashboard', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderAt('/seeker/govt-jobs', <Routes><Route path="/seeker/govt-jobs" element={<LatestGovtJobs />} /></Routes>)
    expect(await screen.findByRole('link', { name: /STATION MASTER/ })).toHaveAttribute('href', '/seeker/govt-jobs/8')
  })
})

describe('Govt Jobs page and dashboard', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens on Latest openings for members and Official portals for guests', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    const { unmount } = renderAt('/govt-jobs', <GovtJobs />)
    expect(screen.getByRole('tab', { name: 'Latest openings' })).toHaveAttribute('aria-selected', 'true')
    unmount()
    useAuthStore.setState({ token: null, user: null })
    renderAt('/govt-jobs', <GovtJobs />)
    expect(screen.getByRole('tab', { name: 'Official portals' })).toHaveAttribute('aria-selected', 'true')
  })

  it("the student dashboard lists govt jobs closing soon, even if another section's request fails", async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderAt('/seeker', <Overview />)
    const row = await screen.findByRole('link', { name: /STATION MASTER/ })
    expect(row).toHaveAttribute('href', '/seeker/govt-jobs/8')
    expect(screen.queryByText(/UPSC Recruitment Advertisement/)).not.toBeInTheDocument() // no deadline → skipped
    await waitFor(() => expect(screen.getByText(/Welcome back, Asha/)).toBeInTheDocument())
    expect(govtJobService.list).toHaveBeenCalledWith({ ordering: 'application_deadline', page_size: 20 })
  })
})
