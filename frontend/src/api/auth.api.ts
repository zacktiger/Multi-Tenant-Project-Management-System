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

export function getInvitation(token: string) {
  return api.get(`/auth/invitations/${token}`);
}

export function acceptInvitation(token: string, data: { name?: string; password?: string }) {
  return api.post(`/auth/invitations/${token}/accept`, data);
}

export function switchOrganization(orgId: string) {
  return api.post(`/auth/switch/${orgId}`);
}
