import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { Folder, ChevronRight, Users } from 'lucide-react';

export default function Workspace() {
  const { id } = useParams();
  const { workspaces, projects, isLoadingProjects, error, fetchProjects } = useStore();

  const workspace = workspaces.find((ws) => ws.id === id);
  const workspaceProjects = projects.filter((p) => p.workspace_id === id);

  useEffect(() => {
    if (id) {
      fetchProjects(id);
    }
  }, [id, fetchProjects]);

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-xl">
            <Users size={22} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {workspace?.name || 'Workspace'}
            </h1>
            <p className="text-gray-500 text-sm">Team Space — {workspaceProjects.length} project{workspaceProjects.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {isLoadingProjects ? (
          <LoadingSpinner message="Loading projects..." />
        ) : error ? (
          <ErrorMessage message={error} onRetry={() => fetchProjects(id!)} />
        ) : workspaceProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Folder size={48} className="mb-4 opacity-40" />
            <p className="text-lg font-medium text-gray-500">No projects yet</p>
            <p className="text-sm text-gray-400">Create a project from the sidebar to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaceProjects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="group block bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                      <Folder size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                        {project.name}
                      </h3>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                        project.status === 'active'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-blue-400 transition-colors mt-1" />
                </div>
                {project.description && (
                  <p className="mt-3 text-sm text-gray-500 line-clamp-2">{project.description}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
