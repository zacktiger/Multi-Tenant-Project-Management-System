import api from './axios';

export function getWorkspaces(orgId: string) {
  return api.get(`/orgs/${orgId}/workspaces`);
}

export function getOrgMembers(orgId: string) {
  return api.get(`/orgs/${orgId}/members`);
}
