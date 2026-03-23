import { create } from 'zustand';
import * as workspaceApi from '../api/workspace.api';
import * as projectApi from '../api/project.api';
import * as taskApi from '../api/task.api';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Workspace {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  workspace_id: string;
  organization_id: string;
  description?: string;
  status: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  project_id: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: string;
  due_date?: string;
  position: number;
}

export interface OrgMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: string;
}

interface AppState {
  workspaces: Workspace[];
  projects: Project[];
  tasks: Task[];
  members: OrgMember[];
  isLoadingWorkspaces: boolean;
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isLoadingMembers: boolean;
  error: string | null;

  // Fetch actions
  fetchWorkspaces: (orgId: string) => Promise<void>;
  fetchProjects: (workspaceId: string) => Promise<void>;
  fetchAllProjects: (workspaces: Workspace[]) => Promise<void>;
  fetchTasks: (projectId: string, filters?: Record<string, string>) => Promise<void>;
  fetchMembers: (orgId: string) => Promise<void>;
  clearTasks: () => void;

  // Mutation actions
  addProject: (project: Project) => void;
  addTask: (task: Task) => void;
  updateTaskInStore: (taskId: string, fields: Partial<Task>) => void;
  moveTaskOptimistic: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  removeTask: (taskId: string) => void;
  setTasks: (tasks: Task[]) => void;
}

export const useStore = create<AppState>((set) => ({
  workspaces: [],
  projects: [],
  tasks: [],
  members: [],
  isLoadingWorkspaces: false,
  isLoadingProjects: false,
  isLoadingTasks: false,
  isLoadingMembers: false,
  error: null,

  fetchWorkspaces: async (orgId) => {
    set({ isLoadingWorkspaces: true, error: null });
    try {
      const { data } = await workspaceApi.getWorkspaces(orgId);
      set({ workspaces: data.data, isLoadingWorkspaces: false });
    } catch (err: any) {
      console.error('Failed to load workspaces:', err.message);
      set({ error: 'Failed to load workspaces', isLoadingWorkspaces: false });
    }
  },

  fetchProjects: async (workspaceId) => {
    set({ isLoadingProjects: true, error: null });
    try {
      const { data } = await projectApi.getProjects(workspaceId, { limit: 50 });
      const incoming = data.data.projects || [];
      set((state) => {
        const filtered = state.projects.filter((p) => p.workspace_id !== workspaceId);
        return { projects: [...filtered, ...incoming], isLoadingProjects: false };
      });
    } catch (err: any) {
      console.error('Failed to load projects:', err.message);
      set({ error: 'Failed to load projects', isLoadingProjects: false });
    }
  },

  fetchAllProjects: async (workspaces) => {
    set({ isLoadingProjects: true, error: null });
    try {
      const results = await Promise.all(
        workspaces.map((ws) => projectApi.getProjects(ws.id, { limit: 50 }))
      );
      const allProjects = results.flatMap((r) => r.data.data.projects || []);
      set({ projects: allProjects, isLoadingProjects: false });
    } catch (err: any) {
      console.error('Failed to load projects:', err.message);
      set({ error: 'Failed to load projects', isLoadingProjects: false });
    }
  },

  fetchTasks: async (projectId, filters) => {
    set({ isLoadingTasks: true, error: null });
    try {
      const { data } = await taskApi.getTasks(projectId, { ...filters, limit: '100' });
      set({ tasks: data.data.tasks || [], isLoadingTasks: false });
    } catch (err: any) {
      console.error('Failed to load tasks:', err.message);
      set({ error: 'Failed to load tasks', isLoadingTasks: false });
    }
  },

  fetchMembers: async (orgId) => {
    set({ isLoadingMembers: true });
    try {
      const { data } = await workspaceApi.getOrgMembers(orgId);
      set({ members: data.data, isLoadingMembers: false });
    } catch (err: any) {
      console.error('Failed to load members:', err.message);
      set({ isLoadingMembers: false });
    }
  },

  clearTasks: () => set({ tasks: [] }),

  // ─── MUTATION ACTIONS ──────────────────────────────────

  addProject: (project) => {
    set((state) => ({ projects: [...state.projects, project] }));
  },

  addTask: (task) => {
    set((state) => ({ tasks: [...state.tasks, task] }));
  },

  updateTaskInStore: (taskId, fields) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, ...fields } : t)),
    }));
  },

  moveTaskOptimistic: (taskId, newStatus, newPosition) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, position: newPosition } : t
      ),
    }));
  },

  removeTask: (taskId) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== taskId),
    }));
  },

  setTasks: (tasks) => set({ tasks }),
}));
