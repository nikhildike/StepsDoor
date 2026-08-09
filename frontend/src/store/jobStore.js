import { create } from 'zustand'

export const useJobStore = create((set) => ({
  jobs: [],
  total: 0,
  filters: { city: '', job_type: '', search: '', page: 1 },
  loading: false,
  setJobs: (jobs, total) => set({ jobs, total }),
  setFilters: (filters) => set((s) => ({ filters: { ...s.filters, ...filters, page: 1 } })),
  setPage: (page) => set((s) => ({ filters: { ...s.filters, page } })),
  setLoading: (loading) => set({ loading }),
}))
