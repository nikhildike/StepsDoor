import api from './api'

export const analyticsService = {
  clicks: (params) => api.get('/analytics/', { params }),
}
