import { useEffect, useRef, useState } from 'react';
import type { Task, TaskPriority } from '../store/useStore';
import { useStore } from '../store/useStore';
import { Calendar, MoreHorizontal, GripVertical } from 'lucide-react';
import * as taskApi from '../api/task.api';
import { useAuthStore } from '../store/useAuthStore';
import toast from 'react-hot-toast';

interface TaskCardProps {
  task: Task;
}

const priorityConfig: Record<TaskPriority, { label: string; classes: string }> = {
  low: { label: 'Low', classes: 'bg-blue-50 text-blue-700' },
  medium: { label: 'Medium', classes: 'bg-yellow-50 text-yellow-700' },
  high: { label: 'High', classes: 'bg-red-50 text-red-700' },
};

export default function TaskCard({ task }: TaskCardProps) {
  const organization = useAuthStore((s) => s.organization);
  const priority = priorityConfig[task.priority] || priorityConfig.medium;
  const { members, removeTask } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const assignee = task.assigned_to ? members.find((m) => m.id === task.assigned_to) : null;
  const canDelete = organization?.role === 'admin';

  const formattedDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleDeleteTask = async () => {
    if (!canDelete) {
      toast.error('Only admins can delete tasks');
      setShowMenu(false);
      return;
    }

    const confirmed = window.confirm(`Delete task "${task.title}"?`);
    if (!confirmed) {
      setShowMenu(false);
      return;
    }

    setIsDeleting(true);
    try {
      await taskApi.deleteTask(task.id);
      removeTask(task.id);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    } finally {
      setIsDeleting(false);
      setShowMenu(false);
    }
  };

  return (
    <div className="group bg-white rounded-lg border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-gray-300 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        
        <div className="flex-1 space-y-3">
          <div className="flex justify-between items-start">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${priority.classes}`}>
              {priority.label}
            </span>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowMenu((prev) => !prev)}
                className="text-gray-400 hover:text-gray-600"
              >
                <MoreHorizontal size={16} />
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete task'}
                  </button>
                </div>
              )}
            </div>
          </div>

          <h4 className="text-sm font-medium text-gray-900 leading-snug line-clamp-2">
            {task.title}
          </h4>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center text-gray-400 space-x-1.5">
              {formattedDate && (
                <>
                  <Calendar size={14} />
                  <span className="text-xs">{formattedDate}</span>
                </>
              )}
            </div>

            {assignee ? (
              <div className="flex -space-x-2">
                <div className="h-6 w-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-blue-600">
                  {assignee.name.charAt(0)}
                </div>
              </div>
            ) : (
              <div className="h-6 w-6 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 hover:border-gray-400 hover:text-gray-400 transition-colors">
                <span className="text-[12px]">+</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
