// RNTL v14: render/fireEvent are async and must be awaited.
// Company careers openings in the Jobs tab's Companies segment: members-only
// gating with no API call for guests, card facts, tap-to-apply, "Show more"
// paging, and the posted-age helper.
import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const job = (id: number, title: string) => ({
  id, title, company_name: 'Razorpay', location: '1401-GIPL: Prestige Tech Park, Bangalore', cities: ['Bengaluru'],
  department: 'Engineering',
  employment_type: 'Full-time', apply_url: `https://boards.greenhouse.io/razorpay/jobs/${id}`,
  posted_at: new Date().toISOString(),
});

jest.mock('@/services/careerService', () => ({
  careerService: {
    list: jest.fn(),
    companies: jest.fn(() => Promise.resolve({ data: [{ id: 4, company_name: 'Razorpay', job_count: 2 }] })),
    cities: jest.fn(() => Promise.resolve({ data: [{ city: 'Bengaluru', count: 2 }] })),
  },
}));

jest.mock('@/services/seekerService', () => ({
  ...jest.requireActual('@/services/seekerService'),
  seekerService: {
    savedJobs: jest.fn(() => Promise.resolve({ data: [] })),
    saveJob: jest.fn(() => Promise.resolve({ data: { id: 50 } })),
    unsaveJob: jest.fn(() => Promise.resolve({})),
  },
}));

import { CompanyOpeningsSection, postedAgo } from './CompanyOpeningsSection';
import { careerService } from '@/services/careerService';
import { useAuthStore } from '@/store/authStore';
import { useSavedJobsStore } from '@/store/savedJobsStore';
import { seekerService } from '@/services/seekerService';

const list = careerService.list as jest.Mock;

describe('CompanyOpeningsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    list.mockImplementation(({ page }: { page: number }) => Promise.resolve({
      data: page === 1
        ? { count: 2, next: 'page2', results: [job(1, 'Backend Engineer II')] }
        : { count: 2, next: null, results: [job(2, 'Data Analyst')] },
    }));
  });

  it('shows the sign-in prompt to guests without calling the API', async () => {
    useAuthStore.setState({ token: null, user: null });
    await render(<CompanyOpeningsSection />);
    expect(screen.getByText('Free for members')).toBeTruthy();
    expect(screen.getByText(/company careers pages\./)).toBeTruthy();
    expect(careerService.list).not.toHaveBeenCalled();
    expect(careerService.companies).not.toHaveBeenCalled();
    expect(careerService.cities).not.toHaveBeenCalled();
  });

  it('lists openings for members, opens the apply page, and loads more', async () => {
    useAuthStore.setState({ token: 'jwt', user: null });
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    await render(<CompanyOpeningsSection />);

    expect(await screen.findByText('Backend Engineer II')).toBeTruthy();
    expect(screen.getByText('Razorpay')).toBeTruthy();
    expect(screen.getByText('Bengaluru')).toBeTruthy(); // standard city, not the office address
    expect(careerService.cities).toHaveBeenCalled();
    expect(screen.getByText('Engineering · Full-time')).toBeTruthy();
    expect(screen.getByText('2 openings')).toBeTruthy();

    await fireEvent.press(screen.getByText('Backend Engineer II'));
    expect(openURL).toHaveBeenCalledWith('https://boards.greenhouse.io/razorpay/jobs/1');

    await fireEvent.press(screen.getByText('Show more'));
    expect(await screen.findByText('Data Analyst')).toBeTruthy();
    expect(screen.getByText('Backend Engineer II')).toBeTruthy(); // appended, not replaced
    await waitFor(() => expect(screen.queryByText('Show more')).toBeNull());
    expect(list).toHaveBeenLastCalledWith({ search: undefined, city: undefined, company: undefined, page: 2 });
  });
});

describe('CompanyOpeningsSection saving', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSavedJobsStore.getState().clear();
    list.mockResolvedValue({ data: { count: 1, next: null, results: [job(1, 'Backend Engineer II')] } });
  });

  it('saves an opening from its card with kind "company"', async () => {
    useAuthStore.setState({ token: 'jwt-save', user: null });
    await render(<CompanyOpeningsSection />);
    await screen.findByText('Backend Engineer II');
    await fireEvent.press(screen.getByLabelText('Save job'));
    expect(seekerService.saveJob).toHaveBeenCalledWith(1, 'company');
    expect(await screen.findByLabelText('Remove from saved')).toBeTruthy();
  });

  it('shows no bookmark to company accounts', async () => {
    useAuthStore.setState({ token: 'jwt-co', user: { id: 1, email: 'a@b.c', username: 'co', is_company: true, is_job_seeker: false, is_contractor: false } });
    await render(<CompanyOpeningsSection />);
    await screen.findByText('Backend Engineer II');
    expect(screen.queryByLabelText('Save job')).toBeNull();
  });
});

describe('postedAgo', () => {
  const now = new Date('2026-11-27T12:00:00Z');
  it('describes how long ago a job was posted', () => {
    expect(postedAgo('2026-11-27T08:00:00Z', now)).toBe('Today');
    expect(postedAgo('2026-11-26T08:00:00Z', now)).toBe('1 day ago');
    expect(postedAgo('2026-11-20T12:00:00Z', now)).toBe('7 days ago');
    expect(postedAgo('2026-07-27T12:00:00Z', now)).toBe('4 months ago');
    expect(postedAgo(null, now)).toBe('');
  });
});
