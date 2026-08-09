import api from './api'

export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  register: (data) => api.post('/auth/register/', data),
  sendOtp: (email) => api.post('/auth/send-otp/', { email }),
  verifyOtp: (email, otp) => api.post('/auth/verify-otp/', { email, otp }),
  me: () => api.get('/auth/me/'),
  refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
}
