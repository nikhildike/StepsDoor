/**
 * AlertMatches.test.jsx — the job seeker features that span every kind of job:
 * matching jobs under each alert (Alerts page), "Jobs matching your alerts" and
 * the stat cards (dashboard), saving from a list, and the Saved Jobs page
 * showing StepsDoor, company and govt jobs.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const MATCHES = {
  count: 3,
  counts: { job: 1, company: 1, govt: 1 },
  results: [
    { kind: 'company', id: 7, title: 'Senior React Developer', company: 'Razorpay', location: 'Bengaluru',
      apply_url: 'https://boards.greenhouse.io/razorpay/jobs/7', posted_at: new Date().toISOString(), deadline: null },
    { kind: 'govt', id: 3, title: 'Junior Developer (React)', company: 'UPSC', location: 'Central Govt',
      apply_url: 'https://upsc.gov.in/a.pdf', posted_at: new Date().toISOString(), deadline: null },
    { kind: 'job', id: 12, title: 'React Developer', company: 'Nimbus Labs', location: 'Bengaluru',
      apply_url: 'https://nimbus.example/careers', posted_at: new Date().toISOString(), deadline: null },
  ],
}

vi.mock('@/services/seekerService', () => ({
  seekerService: {
    savedJobs: vi.fn(),
    saveJob: vi.fn(() => Promise.resolve({ data: { id: 99 } })),
    unsaveJob: vi.fn(() => Promise.resolve({})),
    alerts: vi.fn(() => Promise.resolve({ data: [{ id: 5, role_keyword: 'react developer', city: '', job_type: '', salary_min: null, is_active: true }] })),
    alertMatches: vi.fn(() => Promise.resolve({ data: MATCHES })),
    allAlertMatches: vi.fn(() => Promise.resolve({ data: MATCHES })),
    profile: vi.fn(() => Promise.resolve({ data: { first_name: 'Asha' } })),
    stats: vi.fn(() => Promise.resolve({ data: {
      saved_jobs: 4, active_alerts: 1, alert_matches: 3, new_jobs_today: { total: 120, job: 0, company: 110, govt: 10 },
    } })),
  },
}))
vi.mock('@/services/govtJobService', () => ({
  govtJobService: {
    list: vi.fn(() => Promise.resolve({ data: { results: [] } })),
    alerts: vi.fn(() => Promise.resolve({ data: [] })),
    states: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))
vi.mock('@/services/jobService', () => ({
  jobService: { list: vi.fn(() => Promise.resolve({ data: { results: [] } })), trackClick: vi.fn() },
}))

import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/store/authStore'
import { AlertMatches, matchSummary } from './AlertMatches'
import { useSavedJobs } from '@/hooks/useSavedJobs'
import Alerts from '@/pages/seeker/Alerts'
import SeekerOverview from '@/pages/seeker/Overview'
import SavedJobs from '@/pages/seeker/SavedJobs'

/** AlertMatches wired to a real useSavedJobs, as pages do. */
function WithSaves(props) {
  const saves = useSavedJobs()
  return <AlertMatches {...props} saves={saves} />
}
const inRouter = (ui) => render(<MemoryRouter initialEntries={['/seeker']}>{ui}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
  seekerService.savedJobs.mockResolvedValue({ data: [{ id: 40, kind: 'govt', govt_job: 3, job_post: null, career_job: null }] })
})

describe('AlertMatches', () => {
  it('summarises matches by source', () => {
    expect(matchSummary(MATCHES)).toBe('3 open jobs match: 1 on StepsDoor, 1 from company careers pages, 1 government')
    expect(matchSummary({ count: 0, counts: {} })).toBe('No open jobs match yet')
  })

  it('lists matching jobs with links that stay in the dashboard and already-saved state', async () => {
    inRouter(<WithSaves alertId={5} />)
    expect(await screen.findByText('Senior React Developer')).toBeInTheDocument()
    expect(seekerService.alertMatches).toHaveBeenCalledWith(5, { limit: 20 })
    expect(screen.getByRole('link', { name: 'React Developer' })).toHaveAttribute('href', '/seeker/browse-jobs/12')
    expect(screen.getByRole('link', { name: 'Junior Developer (React)' })).toHaveAttribute('href', '/seeker/govt-jobs/3')
    expect(screen.getByRole('link', { name: 'Senior React Developer' })).toHaveAttribute('href', 'https://boards.greenhouse.io/razorpay/jobs/7')
    // The govt job is already saved (from savedJobs), the others aren't.
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove from saved' })).toHaveLength(1))
    expect(screen.getAllByRole('button', { name: 'Save job' })).toHaveLength(2)
  })

  it('saves a company job with its kind', async () => {
    inRouter(<WithSaves alertId={5} />)
    await screen.findByText('Senior React Developer')
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Save job' })).toHaveLength(2))
    await userEvent.click(screen.getAllByRole('button', { name: 'Save job' })[0])
    expect(seekerService.saveJob).toHaveBeenCalledWith(7, 'company')
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove from saved' })).toHaveLength(2))
  })

  it('starts collapsed behind the summary when collapsible', async () => {
    inRouter(<WithSaves alertId={5} collapsible />)
    const toggle = await screen.findByRole('button', { name: /3 open jobs match/ })
    expect(screen.queryByText('Senior React Developer')).toBeNull()
    await userEvent.click(toggle)
    expect(screen.getByText('Senior React Developer')).toBeInTheDocument()
  })
})

describe('Alerts page', () => {
  it('shows each job alert with its matching jobs', async () => {
    inRouter(<Alerts />)
    expect(await screen.findByText('"react developer"')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /3 open jobs match/ })).toBeInTheDocument()
    expect(seekerService.alertMatches).toHaveBeenCalledWith(5, { limit: 20 })
  })
})

describe('Dashboard', () => {
  it('shows real counts on the stat cards, linked to their pages, and the alert matches', async () => {
    inRouter(<SeekerOverview />)
    const saved = await screen.findByRole('link', { name: /Saved Jobs/ })
    expect(within(saved).getByText('4')).toBeInTheDocument()
    expect(saved).toHaveAttribute('href', '/seeker/saved')
    const alerts = screen.getByRole('link', { name: /Active Alerts/ })
    expect(within(alerts).getByText('3 matching open jobs')).toBeInTheDocument()
    const today = screen.getByRole('link', { name: /New Jobs Today/ })
    expect(within(today).getByText('120')).toBeInTheDocument()
    expect(within(today).getByText('110 company · 10 govt')).toBeInTheDocument()
    expect(await screen.findByText('Senior React Developer')).toBeInTheDocument()
    expect(seekerService.allAlertMatches).toHaveBeenCalledWith({ limit: 5 })
  })

  it('prompts to create an alert when there are none', async () => {
    seekerService.stats.mockResolvedValueOnce({ data: {
      saved_jobs: 0, active_alerts: 0, alert_matches: 0, new_jobs_today: { total: 0, job: 0, company: 0, govt: 0 },
    } })
    inRouter(<SeekerOverview />)
    expect(await screen.findByText('Create an alert →')).toBeInTheDocument()
    expect(seekerService.allAlertMatches).not.toHaveBeenCalled()
  })
})

describe('Saved Jobs page', () => {
  it('lists every kind of saved job, marks closed ones, and opens company jobs directly', async () => {
    seekerService.savedJobs.mockResolvedValue({ data: [
      { id: 1, kind: 'company', career_job: 7, job_title: 'Senior React Developer', company_name: 'Razorpay', city: 'Bengaluru',
        redirect_url: 'https://boards.greenhouse.io/razorpay/jobs/7', is_open: true, job_type: null, deadline: null },
      { id: 2, kind: 'govt', govt_job: 3, job_title: 'Junior Developer (React)', company_name: 'UPSC', city: 'Central Govt',
        redirect_url: 'https://upsc.gov.in/a.pdf', is_open: false, job_type: null, deadline: '2026-12-01T18:29:59Z' },
    ] })
    const open = vi.spyOn(window, 'open').mockImplementation(() => null)
    inRouter(<SavedJobs />)
    expect(await screen.findByText('Senior React Developer')).toBeInTheDocument()
    expect(screen.getByText('Company careers page')).toBeInTheDocument()
    expect(screen.getByText('Government job')).toBeInTheDocument()
    expect(screen.getByText('Closed')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Details →' })).toHaveAttribute('href', '/seeker/govt-jobs/3')
    // Only the open job can be applied for; it opens the company page without click tracking.
    const applyButtons = screen.getAllByRole('button', { name: /Apply/ })
    expect(applyButtons).toHaveLength(1)
    await userEvent.click(applyButtons[0])
    expect(open).toHaveBeenCalledWith('https://boards.greenhouse.io/razorpay/jobs/7', '_blank', 'noopener,noreferrer')
    open.mockRestore()
  })
})
