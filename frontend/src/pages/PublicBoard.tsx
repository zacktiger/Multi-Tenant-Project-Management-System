import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Eye, Link2, Building2 } from 'lucide-react';
import KanbanBoard from '../components/KanbanBoard';
import LoadingSpinner from '../components/LoadingSpinner';
import * as shareApi from '../api/share.api';
import { useStore, type Task } from '../store/useStore';
import { getApiErrorMessage } from '../utils/apiError';

interface SharedBoard {
  project: { id: string; name: string; description?: string; status: string };
  organization: { name: string };
  tasks: Task[];
  assignees: { id: string; name: string; avatar_url?: string }[];
}

export default function PublicBoard() {
  const { token } = useParams();
  const [board, setBoard] = useState<SharedBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Shared boards should never be indexed by search engines
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      document.head.removeChild(meta);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    shareApi
      .getPublicBoard(token)
      .then(({ data }) => {
        if (cancelled) return;
        const shared: SharedBoard = data.data;
        setBoard(shared);

        // TaskCard resolves assignee initials from the members slice
        useStore.setState({
          members: shared.assignees.map((a) => ({
            id: a.id,
            name: a.name,
            email: '',
            avatar_url: a.avatar_url,
            role: 'viewer',
          })),
        });
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, 'This shared board is no longer available'));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      // Don't leak public data into an authenticated session in the same tab
      useStore.setState({ members: [] });
    };
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner message="Loading shared board..." />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 max-w-md w-full text-center space-y-4">
          <div className="mx-auto p-4 bg-gray-50 rounded-full w-fit">
            <Link2 size={28} className="text-gray-300" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900">Board unavailable</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
          <Link
            to="/login"
            className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Sign in to ProjectFlow
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight truncate">
                {board.project.name}
              </h1>
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Eye size={12} />
                Read-only
              </span>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1.5">
              <Building2 size={14} className="text-gray-400 shrink-0" />
              <span className="truncate">{board.organization.name}</span>
            </p>
          </div>

          <Link
            to="/login"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors shrink-0"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {board.project.description && (
          <p className="text-gray-500 text-sm max-w-2xl">{board.project.description}</p>
        )}

        <KanbanBoard
          tasks={board.tasks}
          projectId={board.project.id}
          isViewer
          disableTaskDetail
        />
      </main>

      <footer className="border-t border-gray-200 bg-white px-6 py-4">
        <p className="max-w-7xl mx-auto text-xs text-gray-400">
          Shared via ProjectFlow — this is a read-only snapshot of a single project board.
        </p>
      </footer>
    </div>
  );
}
