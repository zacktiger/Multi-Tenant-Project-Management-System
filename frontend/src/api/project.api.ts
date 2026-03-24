import api from './axios';

export function getProjects(workspaceId: string, params?: { page?: number; limit?: number }) {
  return api.get(`/workspaces/${workspaceId}/projects`, { params });
}

export function getProject(projectId: string) {
  return api.get(`/projects/${projectId}`);
}

export function createProject(workspaceId: string, data: { name: string; description?: string }) {
  return api.post(`/workspaces/${workspaceId}/projects`, data);
}

export function updateProject(projectId: string, fields: { name?: string; description?: string; status?: string }) {
  return api.patch(`/projects/${projectId}`, fields);
}

export function deleteProject(projectId: string) {
  return api.delete(`/projects/${projectId}`);
}
