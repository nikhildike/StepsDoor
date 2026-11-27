// RNTL v14: render/fireEvent are async and must be awaited.
// "Hiring on StepsDoor" companies row: narrowed by the Jobs search text, hidden
// when nothing matches, opens the careers page; and the Jobs tab layout — the row
// sits in the Jobs segment's block and is gone from the Companies segment.
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const COMPANIES = [
  { id: 1, name: 'Acme Infra', slug: 'acme-infra', description: 'Road and bridge contractor', active_job_count: 3 },
  { id: 2, name: 'Nimbus Labs', slug: 'nimbus', description: 'SaaS for clinics', active_job_count: 1 },
];

jest.mock('@/services/companyService', () => ({ companyService: { list: jest.fn() } }));
jest.mock('@/services/jobService', () => ({
  jobService: { list: jest.fn(() => Promise.resolve({ data: { count: 0, results: [] } })) },
}));
jest.mock('@/services/careerService', () => ({
  careerService: { list: jest.fn(), companies: jest.fn(), cities: jest.fn() },
}));

jest.mock('@/services/seekerService', () => ({
  ...jest.requireActual('@/services/seekerService'),
  seekerService: {
    savedJobs: jest.fn(() => Promise.resolve({ data: [] })),
    saveJob: jest.fn(() => Promise.resolve({ data: { id: 50 } })),
    unsaveJob: jest.fn(() => Promise.resolve({})),
  },
}));

import { HiringCompaniesRow } from './HiringCompaniesRow';
import { HomeScreen } from '@/screens/jobs/HomeScreen';
import { companyService } from '@/services/companyService';
import { useAuthStore } from '@/store/authStore';

const companyList = companyService.list as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({ token: null, user: null });
  companyList.mockResolvedValue({ data: { results: COMPANIES } });
});

describe('HiringCompaniesRow', () => {
  it('shows companies and opens a careers page by slug', async () => {
    const onOpen = jest.fn();
    await render(<HiringCompaniesRow onOpen={onOpen} />);
    expect(await screen.findByText('Acme Infra')).toBeTruthy();
    expect(screen.getByText('3 open positions')).toBeTruthy();
    expect(screen.getByText('1 open position')).toBeTruthy();
    await fireEvent.press(screen.getByText('Acme Infra'));
    expect(onOpen).toHaveBeenCalledWith('acme-infra');
  });

  it('is narrowed by the search text, and renders nothing when none match', async () => {
    await render(<HiringCompaniesRow search="clinic" onOpen={jest.fn()} />);
    expect(await screen.findByText('Nimbus Labs')).toBeTruthy();
    expect(screen.queryByText('Acme Infra')).toBeNull();
    await screen.rerender(<HiringCompaniesRow search="bakery" onOpen={jest.fn()} />);
    expect(screen.queryByText(/Hiring on StepsDoor/)).toBeNull();
  });
});

describe('Jobs tab layout', () => {
  it('shows hiring companies in the Jobs segment, with one empty state when nothing matches', async () => {
    const navigation = { navigate: jest.fn() };
    await render(<HomeScreen navigation={navigation} />);
    expect(await screen.findByText('Acme Infra')).toBeTruthy();
    expect(screen.getByText('No jobs found')).toBeTruthy();
    await fireEvent.press(screen.getByText('Acme Infra'));
    expect(navigation.navigate).toHaveBeenCalledWith('CompanyCareers', { slug: 'acme-infra' });
  });

  it('filters companies with the job search box without refetching them', async () => {
    await render(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    expect(await screen.findByText('Acme Infra')).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText('Search jobs or companies...'), 'clinic');
    expect(await screen.findByText('Nimbus Labs')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('Acme Infra')).toBeNull());
    expect(companyList).toHaveBeenCalledTimes(1);
  });

  it('no longer lists StepsDoor companies in the Companies segment', async () => {
    await render(<HomeScreen navigation={{ navigate: jest.fn() }} />);
    await waitFor(() => expect(companyList).toHaveBeenCalledTimes(1)); // the Jobs segment's row
    await fireEvent.press(screen.getByText('Companies'));
    expect(screen.queryByText('Acme Infra')).toBeNull();
    expect(screen.getByText('Latest openings from company careers pages')).toBeTruthy();
    expect(companyList).toHaveBeenCalledTimes(1);
  });
});
