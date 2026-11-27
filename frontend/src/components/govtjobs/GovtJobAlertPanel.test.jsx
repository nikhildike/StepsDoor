/**
 * GovtJobAlertPanel.test.jsx — government job alerts on the job seeker Alerts
 * page: list, create (payload sent to /govtjobs/alerts/), pause with rollback on
 * failure, delete, and that only job seekers (not contractors) see the panel.
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/govtJobService', () => ({
  govtJobService: {
    alerts: vi.fn(),
    states: vi.fn(() => Promise.resolve({ data: [{ state: 'Kerala', count: 4 }] })),
    createAlert: vi.fn(),
    updateAlert: vi.fn(() => Promise.resolve({})),
    deleteAlert: vi.fn(() => Promise.resolve({})),
  },
}))
vi.mock('@/services/seekerService', () => ({
  seekerService: {
    alerts: vi.fn(() => Promise.resolve({ data: [] })),
    savedJobs: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))
vi.mock('@/services/tenderService', () => ({
  tenderService: { alerts: vi.fn(() => Promise.resolve({ data: [] })), saved: vi.fn(() => Promise.resolve({ data: [] })) },
}))

import { govtJobService } from '@/services/govtJobService'
import { useAuthStore } from '@/store/authStore'
import { GovtJobAlertPanel } from './GovtJobAlertPanel'
import Alerts from '@/pages/seeker/Alerts'

const EXISTING = { id: 3, keyword: 'clerk', state: 'Kerala', category: 'state_govt', is_active: true }

beforeEach(() => {
  vi.clearAllMocks()
  govtJobService.alerts.mockResolvedValue({ data: [EXISTING] })
})

describe('GovtJobAlertPanel', () => {
  it('lists alerts and creates one with the chosen filters', async () => {
    govtJobService.createAlert.mockResolvedValue({ data: { id: 4, keyword: 'station master', state: 'Central Govt', category: 'railway', is_active: true } })
    render(<GovtJobAlertPanel />)
    expect(await screen.findByText('"clerk"')).toBeInTheDocument()
    expect(screen.getByText('State Government')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /New Alert/ }))
    await userEvent.type(screen.getByLabelText(/keyword/i), ' station master ')
    await screen.findByRole('option', { name: 'Kerala' })
    await userEvent.selectOptions(screen.getByLabelText('State'), 'Central Govt')
    await userEvent.selectOptions(screen.getByLabelText('Category'), 'railway')
    await userEvent.click(screen.getByRole('button', { name: 'Create Alert' }))

    expect(govtJobService.createAlert).toHaveBeenCalledWith({
      keyword: 'station master', state: 'Central Govt', category: 'railway', is_active: true,
    })
    expect(await screen.findByText('"station master"')).toBeInTheDocument()
  })

  it('pauses an alert, and rolls back if the request fails', async () => {
    render(<GovtJobAlertPanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Pause alert' }))
    expect(govtJobService.updateAlert).toHaveBeenCalledWith(3, { is_active: false })
    expect(screen.getByText('○ Paused')).toBeInTheDocument()

    govtJobService.updateAlert.mockRejectedValueOnce(new Error('down'))
    await userEvent.click(screen.getByRole('button', { name: 'Resume alert' }))
    await waitFor(() => expect(screen.getByText('○ Paused')).toBeInTheDocument())
    expect(screen.getByRole('alert')).toHaveTextContent('Could not update the alert.')
  })

  it('deletes an alert', async () => {
    render(<GovtJobAlertPanel />)
    await userEvent.click(await screen.findByRole('button', { name: 'Delete alert' }))
    expect(govtJobService.deleteAlert).toHaveBeenCalledWith(3)
    expect(screen.queryByText('"clerk"')).not.toBeInTheDocument()
  })
})

describe('Alerts page', () => {
  it('shows government job alerts to job seekers but not to contractors', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    const { unmount } = render(<MemoryRouter><Alerts /></MemoryRouter>)
    const section = await screen.findByRole('region', { name: /Government Job Alerts/ })
    expect(within(section).getByText('"clerk"')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Job Alerts' })).toBeInTheDocument()
    unmount()

    useAuthStore.setState({ token: 'jwt', user: { is_contractor: true } })
    render(<MemoryRouter><Alerts /></MemoryRouter>)
    expect(await screen.findByRole('heading', { name: 'Tender Alerts' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: /Government Job Alerts/ })).not.toBeInTheDocument()
  })
})
