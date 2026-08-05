import { create } from 'zustand';
import * as workspaceApi from '../api/workspace.api';
import * as projectApi from '../api/project.api';
import * as taskApi from '../api/task.api';
import { getApiErrorMessage } from '../utils/apiError';

/**
 * Everything the user is currently looking at: workspaces, projects, tasks,
 * and the member list used to render assignees.
 *
 * Deliberately separate from `useAuthStore`. This data belongs to one
 * organization and is cleared wholesale when the user switches org — see
 * `switchOrgAction` in useAuthStore, which resets these four arrays.
 */

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
  /** Sort order within its status column. Lower renders higher. */
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

  // Mutation actions — these update local state only. The caller is
  // responsible for the matching API request.
  addProject: (project: Project) => void;
  addTask: (task: Task) => void;
  updateTaskInStore: (taskId: string, fields: Partial<Task>) => void;
  moveTaskOptimistic: (taskId: string, newStatus: TaskStatus, newPosition: number) => void;
  removeTask: (taskId: string) => void;
  setTasks: (tasks: Task[]) => void;
}

/**
 * Shared failure path for the fetch actions.
 *
 * Logs for the developer and returns the user-facing slice to merge into state,
 * so the message is written once per call site instead of twice.
 */
function describeFailure(error: unknown, message: string): { error: string } {
  console.error(`${message}:`, error);
  return { error: getApiErrorMessage(error, message) };
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

  // ─── FETCH ACTIONS ─────────────────────────────────────
  // Each follows the same shape: flag loading, call the API, store the result
  // or the error, clear the flag. Loading flags are per-resource so one slow
  // request doesn't blank out unrelated parts of the UI.

  fetchWorkspaces: async (orgId) => {
    set({ isLoadingWorkspaces: true, error: null });
    try {
      const { data } = await workspaceApi.getWorkspaces(orgId);
      set({ workspaces: data.data, isLoadingWorkspaces: false });
    } catch (error) {
      set({ ...describeFailure(error, 'Failed to load workspaces'), isLoadingWorkspaces: false });
    }
  },

  fetchProjects: async (workspaceId) => {
    set({ isLoadingProjects: true, error: null });
    try {
      const { data } = await projectApi.getProjects(workspaceId, { limit: 50 });
      const incoming = data.data.projects || [];

      /*
       * Replace only this workspace's projects, keeping every other
       * workspace's intact. The sidebar can load several workspaces
       * independently, so a plain overwrite would make previously loaded
       * workspaces appear empty.
       */
      set((state) => ({
        projects: [...state.projects.filter((p) => p.workspace_id !== workspaceId), ...incoming],
        isLoadingProjects: false,
      }));
    } catch (error) {
      set({ ...describeFailure(error, 'Failed to load projects'), isLoadingProjects: false });
    }
  },

  fetchAllProjects: async (workspaces) => {
    set({ isLoadingProjects: true, error: null });
    try {
      // One request per workspace, all in flight together rather than in
      // sequence — the dashboard would otherwise take N round trips to paint.
      const results = await Promise.all(
        workspaces.map((ws) => projectApi.getProjects(ws.id, { limit: 50 }))
      );

      // Unlike fetchProjects, this loaded every workspace, so replacing the
      // whole list is correct here.
      set({
        projects: results.flatMap((r) => r.data.data.projects || []),
        isLoadingProjects: false,
      });
    } catch (error) {
      set({ ...describeFailure(error, 'Failed to load projects'), isLoadingProjects: false });
    }
  },

  fetchTasks: async (projectId, filters) => {
    set({ isLoadingTasks: true, error: null });
    try {
      // limit 100: the board renders every task at once, it isn't paginated.
      const { data } = await taskApi.getTasks(projectId, { ...filters, limit: '100' });
      set({ tasks: data.data.tasks || [], isLoadingTasks: false });
    } catch (error) {
      set({ ...describeFailure(error, 'Failed to load tasks'), isLoadingTasks: false });
    }
  },

  fetchMembers: async (orgId) => {
    set({ isLoadingMembers: true });
    try {
      const { data } = await workspaceApi.getOrgMembers(orgId);
      set({ members: data.data, isLoadingMembers: false });
    } catch (error) {
      // Intentionally does not set `error`. Members only populate the assignee
      // dropdown; failing to load them shouldn't put a page-level error banner
      // over an otherwise working board.
      console.error('Failed to load members:', error);
      set({ isLoadingMembers: false });
    }
  },

  clearTasks: () => set({ tasks: [] }),

  // ─── MUTATION ACTIONS ──────────────────────────────────
  // Local state only. Every one of these returns a new array rather than
  // mutating in place, because React re-renders on reference change — pushing
  // into the existing array would update the data but not the screen.

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

  /**
   * Moves a task in the UI before the server has confirmed it.
   *
   * This is the optimistic half of drag-and-drop: the card lands instantly
   * instead of after a network round trip. The caller must snapshot the
   * previous tasks first and call `setTasks(snapshot)` if the request fails —
   * see `handleDrop` in KanbanBoard.tsx. Without that rollback the board would
   * silently disagree with the database.
   */
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

  /** Replaces the task list wholesale. Also the rollback hook for failed moves. */
  setTasks: (tasks) => set({ tasks }),
}));
