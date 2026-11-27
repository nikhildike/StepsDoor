/**
 * HiringCompanies.test.jsx — the "Hiring on StepsDoor" companies row inside the
 * single "Browse Jobs" block: narrowed by the Jobs search text, hidden when
 * nothing matches (so the page has one empty state), careers links that stay in
 * the student dashboard, and that it's gone from the Companies page.
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const COMPANIES = [
  { id: 1, name: 'Acme Infra', slug: 'acme-infra', description: 'Road and bridge contractor', active_job_count: 3 },
  { id: 2, name: 'Nimbus Labs', slug: 'nimbus', description: 'SaaS for clinics', active_job_count: 1 },
]

vi.mock('@/services/companyService', () => ({ companyService: { list: vi.fn() } }))
vi.mock('@/services/jobService', () => ({
  jobService: { list: vi.fn(() => Promise.resolve({ data: { count: 0, results: [] } })) },
}))
vi.mock('@/services/careerService', () => ({ careerService: { list: vi.fn(), companies: vi.fn(), cities: vi.fn() } }))

import { companyService } from '@/services/companyService'
import { useAuthStore } from '@/store/authStore'
import { HiringCompanies } from './HiringCompanies'
import Companies from '@/pages/public/Companies'
import Jobs from '@/pages/public/Jobs'

/** Render at `path`, with public and dashboard careers routes that show where a click landed. */
const renderAt = (ui, path) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path={path} element={ui} />
      <Route path="/careers/:slug" element={<p>public careers page</p>} />
      <Route path="/seeker/careers/:slug" element={<p>dashboard careers page</p>} />
    </Routes>
  </MemoryRouter>,
)

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ token: null, user: null })
  companyService.list.mockResolvedValue({ data: { results: COMPANIES } })
})

describe('HiringCompanies', () => {
  it('shows companies with their open positions', async () => {
    renderAt(<HiringCompanies />, '/jobs')
    expect(await screen.findByText('Acme Infra')).toBeInTheDocument()
    expect(screen.getByText('3 open positions')).toBeInTheDocument()
    expect(screen.getByText('1 open position')).toBeInTheDocument()
    expect(screen.getByText('(2 companies)')).toBeInTheDocument()
  })

  it('is narrowed by the Jobs search text, and hidden when nothing matches', async () => {
    const { rerender } = render(<MemoryRouter><HiringCompanies search="clinic" /></MemoryRouter>)
    expect(await screen.findByText('Nimbus Labs')).toBeInTheDocument()
    expect(screen.queryByText('Acme Infra')).toBeNull()
    rerender(<MemoryRouter><HiringCompanies search="bakery" /></MemoryRouter>)
    expect(screen.queryByText(/Hiring on StepsDoor/)).toBeNull()
  })

  it('opens the public careers page from /jobs', async () => {
    renderAt(<HiringCompanies />, '/jobs')
    await userEvent.click(await screen.findByText('Acme Infra'))
    expect(screen.getByText('public careers page')).toBeInTheDocument()
  })

  it('keeps the careers page inside the student dashboard', async () => {
    renderAt(<HiringCompanies />, '/seeker/browse-jobs')
    await userEvent.click(await screen.findByText('Acme Infra'))
    expect(screen.getByText('dashboard careers page')).toBeInTheDocument()
  })
})

describe('Browse Jobs block', () => {
  it('shows one empty state when there are no jobs and no hiring companies', async () => {
    companyService.list.mockResolvedValue({ data: { results: [] } })
    renderAt(<Jobs />, '/jobs')
    expect(await screen.findByText('No jobs found')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Browse Jobs' })).toBeInTheDocument()
    expect(screen.queryByText(/Hiring on StepsDoor/)).toBeNull()
    expect(screen.queryByText(/No companies are currently hiring/)).toBeNull()
    expect(screen.getAllByRole('textbox')).toHaveLength(1) // a single search box
  })

  it('shows hiring companies inside the same block as the jobs', async () => {
    renderAt(<Jobs />, '/jobs')
    expect(await screen.findByText('Acme Infra')).toBeInTheDocument()
    expect(screen.getByText(/Hiring on StepsDoor/)).toBeInTheDocument()
  })

  it('is no longer on the Companies page', () => {
    renderAt(<Companies />, '/companies')
    expect(screen.getByRole('heading', { name: 'Companies' })).toBeInTheDocument()
    expect(screen.queryByText(/Hiring on StepsDoor/)).toBeNull()
    expect(companyService.list).not.toHaveBeenCalled()
  })
})
