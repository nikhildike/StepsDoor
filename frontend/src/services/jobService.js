import api from './api'

export const jobService = {
  list: (params) => api.get('/jobs/', { params }),
  get: (id) => api.get(`/jobs/${id}/`),
  myJobs: () => api.get('/jobs/my/'),
  create: (data) => api.post('/jobs/', data),
  update: (id, data) => api.patch(`/jobs/${id}/`, data),
  delete: (id) => api.delete(`/jobs/${id}/`),
  trackClick: (id) => api.post(`/jobs/${id}/track-click/`),
}
