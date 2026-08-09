import api from './api';

export const tenderService = {
  list: (params?: object) => api.get('/tenders/', { params }),
  get: (id: number) => api.get(`/tenders/${id}/`),
  alerts: () => api.get('/tenders/alerts/'),
  createAlert: (data: object) => api.post('/tenders/alerts/', data),
  deleteAlert: (id: number) => api.delete(`/tenders/alerts/${id}/`),
};
