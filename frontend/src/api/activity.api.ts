import api from './axios';

export function getActivity(orgId: string, params?: { page?: number; limit?: number }) {
  return api.get(`/orgs/${orgId}/activity`, { params });
}
