import { create } from 'zustand';

interface Job {
  id: number;
  title: string;
  company_name: string;
  company_logo?: string;
  city: string;
  state: string;
  job_type: string;
  salary_min?: number;
  salary_max?: number;
  redirect_url: string;
  created_at: string;
  description?: string;
}

interface Filters {
  search: string;
  city: string;
  job_type: string;
  page: number;
}

interface JobState {
  jobs: Job[];
  total: number;
  filters: Filters;
  loading: boolean;
  setJobs: (jobs: Job[], total: number) => void;
  setFilters: (filters: Partial<Filters>) => void;
  setPage: (page: number) => void;
  setLoading: (loading: boolean) => void;
}

export const useJobStore = create<JobState>((set) => ({
  jobs: [],
  total: 0,
  filters: { search: '', city: '', job_type: '', page: 1 },
  loading: false,
  setJobs: (jobs, total) => set({ jobs, total }),
  setFilters: (filters) =>
    set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  setLoading: (loading) => set({ loading }),
}));
