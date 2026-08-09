import api from './api'

export const storeService = {
  list:       (params) => api.get('/stores/', { params }),
  listRetail: (params) => api.get('/stores/retail/', { params }),
  getMe:      ()       => api.get('/stores/me/'),
  update:     (data)   => api.patch('/stores/me/', data),
  uploadLogo: (formData) => api.patch('/stores/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}
