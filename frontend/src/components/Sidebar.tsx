import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import CreateProjectModal from './CreateProjectModal';
import { Folder, Users, Settings, ChevronRight, LayoutDashboard, Plus } from 'lucide-react';

export default function Sidebar() {
  const { workspaces, projects, isLoadingWorkspaces, fetchWorkspaces, fetchAllProjects } = useStore();
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [createModalWsId, setCreateModalWsId] = useState<string | null>(null);

  const isAdmin = organization?.role === 'admin';

  useEffect(() => {
    if (organization?.id) {
      fetchWorkspaces(organization.id);
    }
  }, [organization?.id, fetchWorkspaces]);

  useEffect(() => {
    if (workspaces.length > 0) {
      fetchAllProjects(workspaces);
    }
  }, [workspaces, fetchAllProjects]);

  return (
    <aside className="w-[240px] bg-[#0f172a] flex flex-col h-full shrink-0">
      {/* Logo Area */}
      <div className="h-14 flex items-center px-6 shrink-0 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <LayoutDashboard size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">Project Flow</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto custom-scrollbar">
        <div className="px-3 mb-6">
          <Link
            to="/dashboard"
            className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
        </div>

        {isLoadingWorkspaces ? (
          <div className="px-6 py-4">
            <div className="h-3 bg-slate-700 rounded animate-pulse mb-3 w-20" />
            <div className="h-3 bg-slate-700 rounded animate-pulse mb-2 w-32" />
            <div className="h-3 bg-slate-700 rounded animate-pulse w-28" />
          </div>
        ) : workspaces.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-xs text-slate-500 italic">No workspaces yet</p>
          </div>
        ) : (
          workspaces.map((workspace) => (
            <div key={workspace.id} className="mb-6">
              <div className="flex items-center justify-between px-6 mb-2">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  {workspace.name}
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => setCreateModalWsId(workspace.id)}
                    className="text-slate-600 hover:text-slate-300 transition-colors"
                    title="New project"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
              <div className="space-y-1 px-3">
                {projects
                  .filter((p) => p.workspace_id === workspace.id)
                  .map((project) => {
                    const isActive = projectId === project.id;
                    return (
                      <Link
                        key={project.id}
                        to={`/project/${project.id}`}
                        className={`flex items-center group px-3 py-2 text-sm rounded-lg transition-all relative ${
                          isActive
                            ? 'bg-blue-900/40 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full" />
                        )}
                        <Folder size={18} className={`mr-3 ${isActive ? 'text-blue-500' : 'group-hover:text-slate-300'}`} />
                        <span className="flex-1 truncate">{project.name}</span>
                        <ChevronRight size={14} className={`opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? 'opacity-40' : ''}`} />
                      </Link>
                    );
                  })}
                
                <button
                  onClick={() => navigate(`/workspace/${workspace.id}`)}
                  className="flex items-center w-full px-3 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors italic"
                >
                  <Users size={16} className="mr-3" />
                  <span>Team Space</span>
                </button>
              </div>
            </div>
          ))
        )}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-slate-800 bg-[#0b1222]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 border-2 border-slate-700">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'user@example.com'}</p>
            </div>
          </div>
          <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {createModalWsId && (
        <CreateProjectModal
          workspaceId={createModalWsId}
          onClose={() => setCreateModalWsId(null)}
        />
      )}
    </aside>
  );
}
