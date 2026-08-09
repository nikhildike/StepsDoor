import { useEffect } from 'react';
import { useJobStore } from '@/store/jobStore';
import { jobService } from '@/services/jobService';

export function useJobs() {
  const { jobs, total, filters, loading, setJobs, setFilters, setPage, setLoading } = useJobStore();

  useEffect(() => {
    setLoading(true);
    jobService
      .list(filters)
      .then(({ data }) => setJobs(data.results, data.count))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filters]);

  return { jobs, total, filters, loading, setFilters, setPage };
}
