import { Inbox } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ message, icon: Icon = Inbox, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
      <div className="p-4 bg-gray-50 rounded-full">
        <Icon size={32} className="text-gray-300" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action && (
        <button onClick={action.onClick} className="btn-primary !w-auto !px-6">
          {action.label}
        </button>
      )}
    </div>
  );
}
