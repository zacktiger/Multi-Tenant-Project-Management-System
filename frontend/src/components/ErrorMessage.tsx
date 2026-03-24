import { AlertTriangle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full py-20 text-center space-y-4">
      <div className="p-4 bg-red-50 rounded-full">
        <AlertTriangle size={32} className="text-red-400" />
      </div>
      <p className="text-sm text-red-600 font-medium">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          Try again
        </button>
      )}
    </div>
  );
}
