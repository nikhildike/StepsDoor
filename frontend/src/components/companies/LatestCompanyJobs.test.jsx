/**
 * LatestCompanyJobs.test.jsx — the company careers openings on the Companies page
 * (/companies and the student dashboard's /seeker/companies): members-only
 * gating with no API call for guests, card facts and apply link, and filters.
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const JOBS = [
  {
    id: 1, title: 'Backend Engineer II', company_name: 'Razorpay', company_id: 4, sector: 'Fintech',
    location: '1401-GIPL: Prestige Technology Park IV, Bangalore', cities: ['Bengaluru'], department: 'Engineering', employment_type: 'Full-time',
    apply_url: 'https://boards.greenhouse.io/razorpay/jobs/1', posted_at: new Date().toISOString(),
  },
]

vi.mock('@/services/careerService', () => ({
  careerService: {
    list: vi.fn(() => Promise.resolve({ data: { count: 1, results: JOBS } })),
    companies: vi.fn(() => Promise.resolve({ data: [{ id: 4, company_name: 'Razorpay', job_count: 1 }] })),
    cities: vi.fn(() => Promise.resolve({ data: [{ city: 'Bengaluru', count: 1 }, { city: 'Pune', count: 3 }] })),
  },
}))

vi.mock('@/services/seekerService', () => ({
  seekerService: {
    savedJobs: vi.fn(() => Promise.resolve({ data: [] })),
    saveJob: vi.fn(() => Promise.resolve({ data: { id: 50 } })),
    unsaveJob: vi.fn(() => Promise.resolve({})),
  },
}))

import { careerService } from '@/services/careerService'
import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/store/authStore'
import { LatestCompanyJobs } from './LatestCompanyJobs'

const renderIt = () => render(<MemoryRouter><LatestCompanyJobs /></MemoryRouter>)

beforeEach(() => { vi.clearAllMocks() })

describe('LatestCompanyJobs', () => {
  it('shows the sign-in prompt to guests without calling the API', () => {
    useAuthStore.setState({ token: null, user: null })
    renderIt()
    expect(screen.getByText('Free for members')).toBeInTheDocument()
    expect(screen.getByText(/company careers pages\./)).toBeInTheDocument()
    expect(careerService.list).not.toHaveBeenCalled()
    expect(careerService.companies).not.toHaveBeenCalled()
    expect(careerService.cities).not.toHaveBeenCalled()
  })

  it('lists openings for members with an apply link to the company site', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderIt()
    expect(await screen.findByText('Backend Engineer II')).toBeInTheDocument()
    expect(screen.getByText('Razorpay')).toBeInTheDocument()
    expect(screen.getByText('Bengaluru')).toBeInTheDocument() // standard city, not the office address
    expect(screen.getByText('Engineering · Full-time')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Apply on company site/ }))
      .toHaveAttribute('href', 'https://boards.greenhouse.io/razorpay/jobs/1')
  })

  it('saves an opening from its card', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderIt()
    await screen.findByText('Backend Engineer II')
    await userEvent.click(screen.getByRole('button', { name: 'Save job' }))
    expect(seekerService.saveJob).toHaveBeenCalledWith(1, 'company')
    expect(await screen.findByRole('button', { name: 'Remove from saved' })).toBeInTheDocument()
  })

  it('filters by city, company and keyword', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    renderIt()
    await screen.findByRole('option', { name: 'Pune (3)' })
    await userEvent.selectOptions(screen.getByLabelText('City'), 'Pune')
    await waitFor(() => expect(careerService.list).toHaveBeenLastCalledWith({ search: undefined, city: 'Pune', company: undefined, page: 1 }))
    await screen.findByRole('option', { name: 'Razorpay (1)' })
    await userEvent.selectOptions(screen.getByLabelText('Company'), '4')
    await waitFor(() => expect(careerService.list).toHaveBeenLastCalledWith({ search: undefined, city: 'Pune', company: '4', page: 1 }))
    await userEvent.type(screen.getByPlaceholderText(/Search role/), 'backend')
    await waitFor(() => expect(careerService.list).toHaveBeenLastCalledWith({ search: 'backend', city: 'Pune', company: '4', page: 1 }))
  })
})
