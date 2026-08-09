import api from './api'

export const freelancerService = {
  list:      (params) => api.get('/freelancers/', { params }),
  get:       (id)     => api.get(`/freelancers/${id}/`),
  me:        ()       => api.get('/freelancers/me/'),
  updateMe:  (data)   => api.patch('/freelancers/me/', data),
  review:    (id, data) => api.post(`/freelancers/${id}/review/`, data),
  states:    ()       => api.get('/freelancers/states/'),
}
