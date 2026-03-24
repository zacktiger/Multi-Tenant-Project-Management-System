import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNavigate, useParams } from 'react-router-dom';
import { Bell, ChevronRight, LogOut, User as UserIcon } from 'lucide-react';

export default function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logoutAction = useAuthStore((s) => s.logoutAction);
  const { projects } = useStore();
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logoutAction();
    navigate('/login');
  };

  const currentProject = projects.find(p => p.id === projectId);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-2 text-sm">
        <span 
          className="text-gray-500 hover:text-gray-900 cursor-pointer transition-colors"
          onClick={() => navigate('/dashboard')}
        >
          Dashboard
        </span>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="font-semibold text-gray-900 truncate max-w-[200px]">
          {currentProject ? currentProject.name : 'Overview'}
        </span>
      </div>

      <div className="flex items-center gap-5">
        <button className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all group">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white group-hover:border-gray-50"></span>
        </button>

        <div className="h-8 w-px bg-gray-200"></div>

        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end mr-1 hidden sm:flex">
            <span className="text-xs font-bold text-gray-900 leading-tight">{user?.name}</span>
            <span className="text-[10px] text-gray-500">Admin Account</span>
          </div>
          
          <div className="group relative">
            <button className="h-9 w-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 hover:ring-4 hover:ring-blue-50 transition-all">
              <UserIcon size={20} />
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all py-1 z-50">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={16} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
