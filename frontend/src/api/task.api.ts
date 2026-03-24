import api from './axios';

export function getTasks(projectId: string, filters?: Record<string, string>) {
  return api.get(`/projects/${projectId}/tasks`, { params: filters });
}

export function getTask(taskId: string) {
  return api.get(`/tasks/${taskId}`);
}

export function createTask(projectId: string, data: {
  title: string;
  status?: 'todo' | 'in_progress' | 'done';
  priority?: string;
  dueDate?: string;
  assignedTo?: string;
}) {
  return api.post(`/projects/${projectId}/tasks`, data);
}

export function updateTask(taskId: string, fields: Record<string, unknown>) {
  return api.patch(`/tasks/${taskId}`, fields);
}

export function moveTask(taskId: string, data: { status: string; position: number }) {
  return api.patch(`/tasks/${taskId}/move`, data);
}

export function deleteTask(taskId: string) {
  return api.delete(`/tasks/${taskId}`);
}
