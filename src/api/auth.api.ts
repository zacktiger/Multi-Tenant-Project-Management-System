import api from './axios';

export function signup(data: { name: string; email: string; password: string; orgName: string }) {
  return api.post('/auth/signup', data);
}

export function login(data: { email: string; password: string }) {
  return api.post('/auth/login', data);
}

export function getMe() {
  return api.get('/auth/me');
}

export function logout(data: { refreshToken: string }) {
  return api.post('/auth/logout', data);
}

export function refresh(data: { refreshToken: string }) {
  return api.post('/auth/refresh', data);
}
