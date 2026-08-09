import api from './api'

export const paymentService = {
  createSubscription: (planId) => api.post('/payments/subscribe/', { plan_id: planId }),
  invoices: () => api.get('/payments/invoices/'),
  downloadInvoice: (id) => api.get(`/payments/invoices/${id}/download/`, { responseType: 'blob' }),
}
