export type Priority = 'Alta' | 'Media' | 'Baja';
export type UserCategory = 'Senior' | 'Staff';

// Effort multipliers by category
export const EFFORT_MULTIPLIERS: Record<UserCategory, number> = {
  Senior: 1.0,
  Staff: 1.4,
};

export interface Task {
  id: string;
  name: string;
  effortBase: number; // Base effort in days before multipliers
  priority: Priority;
  assignedUsers: string[]; // Array of user names assigned to this task
  effortByUser?: Record<string, number>; // Calculated effort per user after multipliers
  startDate?: Date;
  endDate?: Date;
}

export interface User {
  id: string;
  name: string;
  category: UserCategory; // Senior or Staff
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
