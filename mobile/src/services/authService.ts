import api from './api';

export const authService = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login/', credentials),
  register: (data: { username: string; email: string; password: string; is_job_seeker: boolean }) =>
    api.post('/auth/register/', data),
  me: () => api.get('/auth/me/'),
};
