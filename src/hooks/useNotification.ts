import { useState, useCallback } from 'react';

export interface NotificationState {
  message: string;
  type: 'success' | 'error' | 'info';
}

export const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  }, []);

  const closeNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return { notification, notify, closeNotification };
};
