import { useState } from 'react';
import type { Task, TaskStatus } from '../store/useStore';
import { useStore } from '../store/useStore';
import TaskCard from './TaskCard';
import CreateTaskModal from './CreateTaskModal';
import { Plus, LayoutDashboard } from 'lucide-react';
import toast from 'react-hot-toast';
import * as taskApi from '../api/task.api';

interface KanbanBoardProps {
  tasks: Task[];
  projectId: string;
}

const columns: { id: TaskStatus; label: string; color: string }[] = [
  { id: 'todo', label: 'To Do', color: 'border-t-gray-400' },
  { id: 'in_progress', label: 'In Progress', color: 'border-t-blue-500' },
  { id: 'done', label: 'Done', color: 'border-t-emerald-500' },
];

export default function KanbanBoard({ tasks, projectId }: KanbanBoardProps) {
  const [createModalStatus, setCreateModalStatus] = useState<TaskStatus | null>(null);
  const { moveTaskOptimistic, setTasks } = useStore();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;

    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === targetStatus) {
      setDraggedTaskId(null);
      return;
    }

    const targetColumnTasks = tasks.filter((t) => t.status === targetStatus);
    const newPosition = targetColumnTasks.length;

    // Optimistic update
    const previousTasks = [...tasks];
    moveTaskOptimistic(draggedTaskId, targetStatus, newPosition);

    try {
      await taskApi.moveTask(draggedTaskId, { status: targetStatus, position: newPosition });
    } catch {
      setTasks(previousTasks);
      toast.error('Failed to move task');
    }

    setDraggedTaskId(null);
  };

  return (
    <>
      <div className="flex gap-6 overflow-x-auto pb-6 custom-scrollbar">
        {columns.map((column) => {
          const columnTasks = tasks
            .filter((t) => t.status === column.id)
            .sort((a, b) => a.position - b.position);
          
          return (
            <div 
              key={column.id} 
              className={`flex-shrink-0 w-80 min-h-[500px] bg-[#f8fafc]/50 rounded-xl flex flex-col border-t-4 ${column.color}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-gray-700">{column.label}</h3>
                  <span className="bg-white border border-gray-200 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-500 shadow-sm">
                    {columnTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => setCreateModalStatus(column.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Tasks List */}
              <div className="flex-1 px-3 space-y-3">
                {columnTasks.length > 0 ? (
                  columnTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task.id)}
                      className={draggedTaskId === task.id ? 'opacity-40' : ''}
                    >
                      <TaskCard task={task} />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl m-2 bg-gray-50/50">
                    <LayoutDashboard size={24} className="mb-2 opacity-20" />
                    <p className="text-sm">No tasks yet</p>
                  </div>
                )}
              </div>

              {/* Add Task Button */}
              <div className="p-3">
                <button
                  onClick={() => setCreateModalStatus(column.id)}
                  className="w-full flex items-center justify-center space-x-2 py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-all group"
                >
                  <Plus size={16} className="text-gray-400 group-hover:text-blue-500" />
                  <span className="font-medium">Add task</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {createModalStatus && (
        <CreateTaskModal
          projectId={projectId}
          defaultStatus={createModalStatus}
          onClose={() => setCreateModalStatus(null)}
        />
      )}
    </>
  );
}
