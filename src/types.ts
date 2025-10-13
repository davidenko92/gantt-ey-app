export type Priority = 'Alta' | 'Media' | 'Baja';
export type UserCategory = 'Senior' | 'Staff';
export type TaskType = 'development' | 'review' | 'correction';

// Effort multipliers by category
export const EFFORT_MULTIPLIERS: Record<UserCategory, number> = {
  Senior: 1.0,
  Staff: 1.4,
};

export interface Task {
  id: string;
  code: string; // P035, P036...
  name: string;
  effortBase: number; // Base effort in days before multipliers
  priority: Priority;
  team: string; // ID of the team responsible for this task
  assignedUsers: string[]; // Array of user names assigned to this task

  // Task type and workflow
  taskType?: TaskType; // 'development' | 'review' | 'correction'
  parentTaskId?: string; // For derived tasks (reviews, corrections)

  // Team efforts configuration (editable from UI)
  teamEfforts: Record<string, TaskTeamEffort>;

  // Dependencies and behavior
  dependsOn?: string[]; // IDs of tasks that must complete first
  canStartInParallel?: boolean; // Can run while other teams work
  interruptsCurrent?: boolean; // Interrupts current tasks when unblocked

  // Calculated fields
  effortByUser?: Record<string, number>; // Calculated effort per user after multipliers
  startDate?: Date;
  endDate?: Date;
  status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
}

export interface TaskTeamEffort {
  enabled: boolean; // Is this team active for this task?
  reviewEffort: number; // Days for review/audit (base, before multipliers)
  reviewAssignedUsers: string[]; // Reviewers assigned
  correctionEffort: number; // Days for correction (base, before multipliers)
  correctionAssignedUsers: string[]; // Users who will do the correction
}

export interface User {
  id: string;
  name: string;
  category: UserCategory; // Senior or Staff
  color: string;
  vacations: Date[];
}

export interface Team {
  id: string;
  name: string;
  color: string;
  icon?: string;
  users: User[];
  config: TeamConfig;
}

export interface TeamConfig {
  // Dependencies
  dependsOn?: string; // ID of team this depends on

  // Behavior
  canWorkInParallel: boolean; // Can work while other teams work
  triggersCorrection: boolean; // Generates correction task after review
  correctionTeam?: string; // Team that does the correction
  correctionPriority: Priority; // Priority of correction tasks
  interruptsCurrent: boolean; // Interrupts current tasks of correction team

  // Defaults
  defaultReviewEffortPercent?: number; // Default review effort as % of dev effort
  defaultCorrectionDays?: number; // Default correction days

  // Execution order
  executionOrder?: number; // Lower = executed first
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
