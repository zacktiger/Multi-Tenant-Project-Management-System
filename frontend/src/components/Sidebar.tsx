import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import CreateProjectModal from './CreateProjectModal';
import { Folder, Users, Settings, ChevronRight, LayoutDashboard, Plus, LogOut, Building2, ChevronDown, Check } from 'lucide-react';

export default function Sidebar() {
  const { workspaces, projects, isLoadingWorkspaces, fetchWorkspaces, fetchAllProjects } = useStore();
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const organizations = useAuthStore((s) => s.organizations);
  const switchOrgAction = useAuthStore((s) => s.switchOrgAction);
  const logoutAction = useAuthStore((s) => s.logoutAction);
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [createModalWsId, setCreateModalWsId] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showOrgMenu, setShowOrgMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgMenuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target as Node)) {
        setShowOrgMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    setShowUserMenu(false);
    navigate('/login');
  };

  const handleSwitchOrg = async (orgId: string) => {
    if (orgId === organization?.id) return;
    const error = await switchOrgAction(orgId);
    if (!error) {
      setShowOrgMenu(false);
      navigate('/dashboard');
    }
  };

  return (
    <aside className="w-[240px] bg-[#0f172a] flex flex-col h-full shrink-0">
      {/* Logo & Org Switcher */}
      <div className="flex flex-col shrink-0 border-b border-slate-800">
        <div className="h-14 flex items-center px-6 border-b border-slate-800/50">
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
              <LayoutDashboard size={18} className="text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">Project Flow</span>
          </div>
        </div>

        <div className="relative px-3 py-3" ref={orgMenuRef}>
          <button
            onClick={() => setShowOrgMenu((prev) => !prev)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 rounded-xl transition-all group"
          >
            <div className="flex items-center space-x-2 overflow-hidden text-left">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20">
                <Building2 size={14} />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-white truncate uppercase tracking-wider">{organization?.name}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate capitalize">{organization?.role}</p>
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showOrgMenu ? 'rotate-180' : ''}`} />
          </button>

          {showOrgMenu && (
            <div className="absolute top-full left-3 right-3 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
              <div className="px-3 pb-2 mb-1 border-b border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Organization</span>
              </div>
              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSwitchOrg(org.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-800 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div className={`h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold border ${
                        org.id === organization?.id 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-400'
                      }`}>
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`truncate ${org.id === organization?.id ? 'text-white font-semibold' : 'text-slate-400'}`}>
                        {org.name}
                      </span>
                    </div>
                    {org.id === organization?.id && <Check size={14} className="text-blue-500 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="px-2 pt-1 mt-1 border-t border-slate-800">
                <Link
                  to="/signup"
                  className="w-full flex items-center px-2 py-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors uppercase tracking-wider"
                >
                  <Plus size={12} className="mr-2" />
                  Create Organization
                </Link>
              </div>
            </div>
          )}
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
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu((prev) => !prev)}
              className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Account actions"
            >
              <Settings size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute bottom-10 right-0 w-44 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 z-20">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-xs text-red-300 hover:text-red-200 hover:bg-slate-800"
                >
                  <LogOut size={14} className="mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
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
