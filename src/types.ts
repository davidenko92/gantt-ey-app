export type Priority = 'Alta' | 'Media' | 'Baja';

export interface Task {
  id: string;
  name: string;
  effort: number;
  priority: Priority;
  assignedUser?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface User {
  id: string;
  name: string;
  color: string;
  vacations: Date[];
}

export interface NotificationType {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface GanttConfig {
  startDate: Date;
  holidays: Date[];
}

// Validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
