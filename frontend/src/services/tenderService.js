import api from './api'

export const tenderService = {
  list: (params) => api.get('/tenders/', { params }),
  get: (id) => api.get(`/tenders/${id}/`),
  states: () => api.get('/tenders/states/'),
  alerts: () => api.get('/tenders/alerts/'),
  createAlert: (data) => api.post('/tenders/alerts/', data),
  deleteAlert: (id) => api.delete(`/tenders/alerts/${id}/`),
}
