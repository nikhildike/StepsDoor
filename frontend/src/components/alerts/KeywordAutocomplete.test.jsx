/**
 * KeywordAutocomplete.test.jsx — the job alert form's Role / Keyword suggestions:
 * shown while typing (from open job titles), picked by click or keyboard, Escape
 * closes them, short text asks nothing, and the picked keyword is what the
 * Alerts page saves.
 */
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/services/seekerService', () => ({
  seekerService: {
    keywordSuggestions: vi.fn(() => Promise.resolve({ data: [
      { keyword: 'Data Engineer', count: 66 }, { keyword: 'Data Analyst', count: 9 },
    ] })),
    alerts: vi.fn(() => Promise.resolve({ data: [] })),
    createAlert: vi.fn((data) => Promise.resolve({ data: { id: 1, ...data } })),
    savedJobs: vi.fn(() => Promise.resolve({ data: [] })),
    alertMatches: vi.fn(() => Promise.resolve({ data: { count: 0, counts: {}, results: [] } })),
  },
}))
vi.mock('@/services/govtJobService', () => ({
  govtJobService: { alerts: vi.fn(() => Promise.resolve({ data: [] })), states: vi.fn(() => Promise.resolve({ data: [] })) },
}))

import { seekerService } from '@/services/seekerService'
import { useAuthStore } from '@/store/authStore'
import { KeywordAutocomplete } from './KeywordAutocomplete'
import Alerts from '@/pages/seeker/Alerts'

/** The component with its own state, as a form would hold it. */
function Field() {
  const [value, setValue] = useState('')
  return <KeywordAutocomplete value={value} onChange={setValue} placeholder="Role" />
}

beforeEach(() => { vi.clearAllMocks() })

describe('KeywordAutocomplete', () => {
  it('suggests keywords with job counts while typing, and a click fills the box', async () => {
    render(<Field />)
    await userEvent.type(screen.getByPlaceholderText('Role'), 'data')
    expect(await screen.findByRole('option', { name: /Data Engineer/ })).toBeInTheDocument()
    expect(screen.getByText('66 jobs')).toBeInTheDocument()
    expect(seekerService.keywordSuggestions).toHaveBeenLastCalledWith('data')
    await userEvent.click(screen.getByRole('option', { name: /Data Analyst/ }))
    expect(screen.getByPlaceholderText('Role')).toHaveValue('Data Analyst')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('picks with the arrow keys and Enter, and Escape closes', async () => {
    render(<Field />)
    const box = screen.getByPlaceholderText('Role')
    await userEvent.type(box, 'data')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('option', { name: /Data Analyst/ })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Enter}')
    expect(box).toHaveValue('Data Analyst')

    await userEvent.type(box, 's')
    await screen.findByRole('listbox')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it("doesn't ask for one character", async () => {
    render(<Field />)
    await userEvent.type(screen.getByPlaceholderText('Role'), 'd')
    await new Promise(r => setTimeout(r, 400))
    expect(seekerService.keywordSuggestions).not.toHaveBeenCalled()
  })
})

describe('Alerts page keyword field', () => {
  it('saves the picked suggestion as the alert keyword', async () => {
    useAuthStore.setState({ token: 'jwt', user: { is_job_seeker: true } })
    render(<MemoryRouter><Alerts /></MemoryRouter>)
    // The first "New Alert" is the job alerts panel's (the govt job alerts panel has its own).
    await userEvent.click((await screen.findAllByRole('button', { name: /New Alert/ }))[0])
    await userEvent.type(screen.getByLabelText('Role / Keyword'), 'data')
    await userEvent.click(await screen.findByRole('option', { name: /Data Engineer/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Create Alert' }))
    await waitFor(() => expect(seekerService.createAlert).toHaveBeenCalled())
    expect(seekerService.createAlert.mock.calls[0][0].role_keyword).toBe('Data Engineer')
  })
})
