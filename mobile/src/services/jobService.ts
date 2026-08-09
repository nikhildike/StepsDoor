import api from './api';

export const jobService = {
  list: (params?: object) => api.get('/jobs/', { params }),
  get: (id: number) => api.get(`/jobs/${id}/`),
  saved: () => api.get('/jobseekers/saved/'),
  save: (jobId: number) => api.post('/jobseekers/saved/', { job_post: jobId }),
  unsave: (jobId: number) => api.delete(`/jobseekers/saved/${jobId}/`),
};
