import { useEffect } from 'react';
import { LayoutDashboard, CheckCircle2, Users, Briefcase, Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export default function Dashboard() {
  const { projects, members, fetchMembers, isLoadingMembers } = useStore();
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (organization?.id) {
      fetchMembers(organization.id);
    }
  }, [organization?.id, fetchMembers]);

  const stats = [
    { 
      label: 'Total Projects', 
      value: String(projects.length), 
      icon: <Briefcase className="text-blue-600" size={24} />, 
      bgColor: 'bg-blue-50',
      trend: `Across ${new Set(projects.map(p => p.workspace_id)).size} workspace(s)`
    },
    { 
      label: 'Active Tasks', 
      value: '—', 
      icon: <CheckCircle2 className="text-emerald-600" size={24} />, 
      bgColor: 'bg-emerald-50',
      trend: 'Select a project to view'
    },
    { 
      label: 'Team Members', 
      value: isLoadingMembers ? '...' : String(members.length), 
      icon: <Users className="text-purple-600" size={24} />, 
      bgColor: 'bg-purple-50',
      trend: organization?.name || 'Your organization'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome back, {user?.name?.split(' ')[0]}! Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="card flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs font-medium text-gray-400 mt-2">{stat.trend}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bgColor}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder for Recent Activity/Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card h-64 flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-4 bg-gray-50 rounded-full">
            <LayoutDashboard size={32} className="text-gray-300" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">No recent updates in your projects.</p>
          </div>
        </div>
        
        <div className="card h-64 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 group cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all">
          <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
            <Plus size={32} className="text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Create New Project</h3>
            <p className="text-sm text-gray-500">Start a new workspace for your team.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
