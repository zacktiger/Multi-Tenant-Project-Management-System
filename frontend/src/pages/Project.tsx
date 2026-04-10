import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import KanbanBoard from '../components/KanbanBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import InviteModal from '../components/InviteModal';
import { Filter, Search, Plus, MoreHorizontal } from 'lucide-react';

export default function Project() {
  const { id } = useParams();
  const { projects, tasks, isLoadingTasks, error, fetchTasks } = useStore();
  const organization = useAuthStore((s) => s.organization);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const isAdmin = organization?.role === 'admin';
  const isViewer = organization?.role === 'viewer';
  
  const project = projects.find((p) => p.id === id);

  useEffect(() => {
    if (id) {
      fetchTasks(id);
    }
  }, [id, fetchTasks]);

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
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between py-2">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            />
          </div>
          <button className="p-2 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <Filter size={20} />
          </button>
          <button className="p-2 border border-gray-200 bg-white rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-all shadow-sm">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 bg-gray-100/50 p-1 rounded-xl border border-gray-200 shadow-inner">
          <button className="px-4 py-1.5 bg-white text-gray-900 rounded-lg shadow-sm border border-gray-100">Board</button>
          <button className="px-4 py-1.5 hover:text-gray-900 transition-colors">List</button>
          <button className="px-4 py-1.5 hover:text-gray-900 transition-colors">Timeline</button>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 min-h-0">
        {isLoadingTasks ? (
          <LoadingSpinner message="Loading tasks..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => fetchTasks(id!)} />
        ) : (
          <KanbanBoard tasks={tasks} projectId={id!} />
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal onClose={() => setShowInviteModal(false)} />
      )}
    </div>
  );
}

