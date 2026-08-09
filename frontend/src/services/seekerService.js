import api from './api'

export const seekerService = {
  profile: () => api.get('/jobseekers/profiles/me/'),
  updateProfile: (data) => api.patch('/jobseekers/profiles/me/', data),
  savedJobs: () => api.get('/jobseekers/saved-jobs/'),
  saveJob: (jobPostId) => api.post('/jobseekers/saved-jobs/', { job_post: jobPostId }),
  unsaveJob: (savedJobId) => api.delete(`/jobseekers/saved-jobs/${savedJobId}/`),
  alerts: () => api.get('/alerts/'),
  createAlert: (data) => api.post('/alerts/', data),
  updateAlert: (id, data) => api.patch(`/alerts/${id}/`, data),
  deleteAlert: (id) => api.delete(`/alerts/${id}/`),
}
