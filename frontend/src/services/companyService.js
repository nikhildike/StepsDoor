import api from './api'

export const companyService = {
  list: () => api.get('/companies/public/'),
  get: () => api.get('/companies/me/'),
  update: (data) => api.patch('/companies/me/', data),
  uploadLogo: (formData) => api.patch('/companies/me/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  careers: (slug) => api.get(`/companies/${slug}/careers/`),
}
