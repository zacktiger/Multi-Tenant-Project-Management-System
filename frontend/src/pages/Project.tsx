import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore, type TaskStatus } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import KanbanBoard from '../components/KanbanBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import InviteModal from '../components/InviteModal';
import { Filter, Search, Plus, MoreHorizontal } from 'lucide-react';

type ViewMode = 'board' | 'list' | 'timeline';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high';
type StatusFilter = 'all' | TaskStatus;

const statusLabel: Record<TaskStatus, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export default function Project() {
  const { id } = useParams();
  const { projects, tasks, members, isLoadingTasks, error, fetchTasks } = useStore();
  const organization = useAuthStore((s) => s.organization);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('board');

  const isAdmin = organization?.role === 'admin';
  const isViewer = organization?.role === 'viewer';
  
  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (id) {
      const filters: Record<string, string> = {};
      if (priorityFilter !== 'all') {
        filters.priority = priorityFilter;
      }
      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }
      fetchTasks(id, filters);
    }
  }, [id, fetchTasks, priorityFilter, statusFilter]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return tasks;

    return tasks.filter((task) => {
      const title = task.title?.toLowerCase() || '';
      const description = task.description?.toLowerCase() || '';
      return title.includes(query) || description.includes(query);
    });
  }, [tasks, searchQuery]);

  const timelineTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => !!task.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }, [filteredTasks]);

  const resetToolbarState = () => {
    setSearchQuery('');
    setPriorityFilter('all');
    setStatusFilter('all');
    setShowFilters(false);
  };

  const getMemberName = (memberId?: string) => {
    if (!memberId) return 'Unassigned';
    return members.find((m) => m.id === memberId)?.name || 'Unknown user';
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <h2 className="text-xl font-medium">Project not found</h2>
        <p>Please select a project from the sidebar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{project.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              project.status === 'active' 
                ? 'bg-blue-100 text-blue-700 border-blue-200' 
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
            </span>
          </div>
          <p className="text-gray-500 text-sm max-w-xl">{project.description || 'No description provided for this project.'}</p>
        </div>

        <div className="flex items-center space-x-3 pb-1">
          {isViewer && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-medium">
              View only
            </span>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="btn-primary flex items-center space-x-2 !py-1.5 !w-auto"
            >
              <Plus size={18} />
              <span>Invite Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between py-2 relative">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            className="p-2 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            title="Filters"
          >
            <Filter size={20} />
          </button>
          <button
            onClick={resetToolbarState}
            className="p-2 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            title="Reset search & filters"
          >
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100/50 p-1 rounded-xl border border-gray-200 shadow-inner">
          <button
            onClick={() => setViewMode('board')}
            className={`px-4 py-1.5 rounded-lg transition-colors ${viewMode === 'board' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'hover:text-gray-900'}`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'hover:text-gray-900'}`}
          >
            List
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-4 py-1.5 rounded-lg transition-colors ${viewMode === 'timeline' ? 'bg-white text-gray-900 shadow-sm border border-gray-100' : 'hover:text-gray-900'}`}
          >
            Timeline
          </button>
        </div>

        {showFilters && (
          <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-10 w-full md:w-[360px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="input-field"
                >
                  <option value="all">All statuses</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-gray-500 font-medium">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                  className="input-field"
                >
                  <option value="all">All priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0">
        {isLoadingTasks ? (
          <LoadingSpinner message="Loading tasks..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => fetchTasks(id!)} />
        ) : viewMode === 'board' ? (
          <KanbanBoard tasks={filteredTasks} projectId={id!} />
        ) : viewMode === 'list' ? (
          filteredTasks.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
              No tasks match your search/filter.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Task</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Priority</th>
                    <th className="px-4 py-3 font-semibold">Due</th>
                    <th className="px-4 py-3 font-semibold">Assignee</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((task) => (
                    <tr key={task.id} className="border-t border-gray-100">
                      <td className="px-4 py-3 text-gray-900 font-medium">{task.title}</td>
                      <td className="px-4 py-3 text-gray-600">{statusLabel[task.status]}</td>
                      <td className="px-4 py-3 text-gray-600 capitalize">{task.priority}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{getMemberName(task.assigned_to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : timelineTasks.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-500">
            No dated tasks to show in timeline.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            {timelineTasks.map((task) => (
              <div key={task.id} className="flex items-start gap-4 border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                <div className="text-xs font-semibold text-blue-600 min-w-24 pt-1">
                  {new Date(task.due_date!).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{task.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {statusLabel[task.status]} • {task.priority} priority • {getMemberName(task.assigned_to)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}

