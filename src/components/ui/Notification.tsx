import React from 'react';

interface NotificationProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  return (
    <div
      className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
        type === 'success'
          ? 'bg-green-50 text-green-700 border-l-4 border-green-400'
          : type === 'error'
            ? 'bg-red-50 text-red-700 border-l-4 border-red-400'
            : 'bg-blue-50 text-blue-700 border-l-4 border-blue-400'
      }`}
    >
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="ml-3 text-gray-400">
          ×
        </button>
      </div>
    </div>
  );
};
