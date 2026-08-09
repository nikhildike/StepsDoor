import api from './api'

export const subscriptionService = {
  plans: () => api.get('/subscriptions/plans/'),
  current: () => api.get('/subscriptions/current/'),
}
