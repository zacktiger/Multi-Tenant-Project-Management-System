import { useEffect, useState, useCallback } from 'react';
import { LayoutDashboard, CheckCircle2, Users, Briefcase, Plus, Clock, ChevronDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';
import LoadingSpinner from '../components/LoadingSpinner';
import CreateProjectModal from '../components/CreateProjectModal';
import * as activityApi from '../api/activity.api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

interface Activity {
  id: string;
  user_name: string;
  action: string;
  entity_type: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
  created_at: string;
}

export default function Dashboard() {
  const { 
    projects, 
    members, 
    workspaces,
    fetchMembers, 
    fetchWorkspaces,
    fetchAllProjects,
    fetchProjects,
    isLoadingMembers,
    isLoadingProjects,
    isLoadingWorkspaces
  } = useStore();
  
  const organization = useAuthStore((s) => s.organization);
  const user = useAuthStore((s) => s.user);

  const isMember = organization?.role === 'member' || organization?.role === 'admin';
  const isViewer = !isMember;

  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  
  // Project creation state
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>('');
  const [isSelectingWorkspace, setIsSelectingWorkspace] = useState(false);

  const loadDashboardData = useCallback(async () => {
    if (!organization?.id) return;
    
    fetchMembers(organization.id);
    fetchWorkspaces(organization.id);
    
    setIsLoadingActivity(true);
    try {
      const res = await activityApi.getActivity(organization.id, { limit: 10 });
      setActivities(res.data.data.activities);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setIsLoadingActivity(false);
    }
  }, [organization?.id, fetchMembers, fetchWorkspaces]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (workspaces.length > 0) {
      fetchAllProjects(workspaces);
    }
  }, [workspaces, fetchAllProjects]);

  const handleCreateProjectClick = () => {
    if (workspaces.length === 0) {
      toast.error('Create a workspace first');
    } else if (workspaces.length === 1) {
      setSelectedWorkspaceId(workspaces[0].id);
      setShowCreateProject(true);
    } else {
      setIsSelectingWorkspace(true);
    }
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspaceId(workspaceId);
    setIsSelectingWorkspace(false);
    setShowCreateProject(true);
  };

  const isLoading = isLoadingProjects || isLoadingWorkspaces;

  if (isLoading && projects.length === 0) {
    return <LoadingSpinner message="Loading dashboard data..." />;
  }

  const stats = [
    { 
      label: 'Total Projects', 
      value: String(projects.length), 
      icon: <Briefcase className="text-blue-600" size={24} />, 
      bgColor: 'bg-blue-50',
      trend: `Across ${workspaces.length} workspace(s)`
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

  const getActionText = (activity: Activity) => {
    const name = activity.metadata?.name || activity.metadata?.title || 'an item';
    switch (activity.action) {
      case 'project_created': return `created project "${name}"`;
      case 'task_created': return `created task "${name}"`;
      case 'task_updated': return `updated task "${name}"`;
      case 'task_moved': return `moved task "${name}" to ${activity.metadata?.status}`;
      case 'task_deleted': return `deleted task "${name}"`;
      default: return `performed ${activity.action} on ${activity.entity_type}`;
    }
  };

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

      {/* Recent Activity/Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card min-h-64 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              Recent Activity
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-80 space-y-4 pr-2 custom-scrollbar">
            {isLoadingActivity ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold shrink-0 uppercase text-xs">
                    {activity.user_name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900">
                      <span className="font-semibold">{activity.user_name}</span> {getActionText(activity)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <LayoutDashboard size={32} className="mb-2 opacity-20" />
                <p className="text-sm">No recent activity found.</p>
              </div>
            )}
          </div>
        </div>
        
        {isViewer ? (
          <div className="card min-h-64 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-4 bg-gray-50 rounded-full">
              <Briefcase size={32} className="text-gray-300" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-500">View Only Access</h3>
              <p className="text-sm text-gray-400">Contact an admin to create projects.</p>
            </div>
          </div>
        ) : isSelectingWorkspace ? (
          <div className="card min-h-64 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 transition-all border-blue-300 bg-blue-50/20">
            <div className="p-4 bg-blue-100 rounded-full">
              <Plus size={32} className="text-blue-600" />
            </div>
            <div className="w-full max-w-xs space-y-3">
              <h3 className="font-semibold text-gray-900">Select Workspace</h3>
              <div className="relative">
                <select 
                  className="input-field pr-10 appearance-none bg-white"
                  onChange={(e) => handleWorkspaceSelect(e.target.value)}
                  defaultValue=""
                >
                  <option value="" disabled>Choose a workspace...</option>
                  {workspaces.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
              <button 
                onClick={() => setIsSelectingWorkspace(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div 
            onClick={handleCreateProjectClick}
            className="card min-h-64 border-dashed border-2 flex flex-col items-center justify-center text-center space-y-4 group cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all"
          >
            <div className="p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
              <Plus size={32} className="text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">Create New Project</h3>
              <p className="text-sm text-gray-500">Start a new workspace for your team.</p>
            </div>
          </div>
        )}
      </div>

      {showCreateProject && selectedWorkspaceId && (
        <CreateProjectModal
          workspaceId={selectedWorkspaceId}
          onClose={() => setShowCreateProject(false)}
          onSuccess={() => {
            setShowCreateProject(false);
            fetchProjects(selectedWorkspaceId);
            toast.success('Project created');
          }}
        />
      )}
    </div>
  );
}
