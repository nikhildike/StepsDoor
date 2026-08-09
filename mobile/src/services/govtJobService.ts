import api from './api';

export const govtJobService = {
  list: (params?: object) => api.get('/govtjobs/', { params }),
  get: (id: number) => api.get(`/govtjobs/${id}/`),
  alerts: () => api.get('/govtjobs/alerts/'),
  createAlert: (data: object) => api.post('/govtjobs/alerts/', data),
  deleteAlert: (id: number) => api.delete(`/govtjobs/alerts/${id}/`),
};
