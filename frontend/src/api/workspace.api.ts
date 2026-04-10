import api from './axios';

export function getWorkspaces(orgId: string) {
  return api.get(`/orgs/${orgId}/workspaces`);
}

export function getOrgMembers(orgId: string) {
  return api.get(`/orgs/${orgId}/members`);
}

export function inviteOrgMember(orgId: string, email: string, role: string) {
  return api.post(`/orgs/${orgId}/members/invite`, { email, role });
}
