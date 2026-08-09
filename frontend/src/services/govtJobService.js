import api from './api'

export const govtJobService = {
  list: (params) => api.get('/govtjobs/', { params }),
  get: (id) => api.get(`/govtjobs/${id}/`),
  states: () => api.get('/govtjobs/states/'),
  alerts: () => api.get('/govtjobs/alerts/'),
  createAlert: (data) => api.post('/govtjobs/alerts/', data),
  deleteAlert: (id) => api.delete(`/govtjobs/alerts/${id}/`),
}
