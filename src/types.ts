export type Priority = 'Alta' | 'Media' | 'Baja';
export type UserCategory = 'Senior' | 'Staff';
export type TaskType = 'development' | string; // 'development' is reserved, others are dynamic

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
  taskType?: TaskType; // 'development' | 'review' | 'stabilization'
  parentTaskId?: string; // For derived tasks (reviews, stabilizations)

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
  originalTaskIndex?: number; // Index from original input file (for file-order strategy)
}

export interface TaskTeamEffort {
  enabled: boolean; // Is this team active for this task?

  // Primary task (review/audit/testing, etc.)
  reviewEffort: number; // Days for primary task (base, before multipliers)
  reviewAssignedUsers: string[]; // Users assigned to primary task
  reviewTaskName?: string; // Custom name for this task (e.g., "Auditoría", "Testing")
  reviewPriority?: Priority; // Custom priority for this task

  // Follow-up task (stabilization/correction, etc.)
  correctionEffort: number; // Days for follow-up task (base, before multipliers)
  correctionAssignedUsers: string[]; // Users for follow-up task
  correctionTaskName?: string; // Custom name for follow-up task (e.g., "Corrección", "Estabilización")
  correctionPriority?: Priority; // Custom priority for follow-up task
  generateCorrection: boolean; // Should this task generate a follow-up task?
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
  triggersCorrection: boolean; // Generates stabilization task after review
  correctionTeam?: string; // Team that does the stabilization
  correctionPriority: Priority; // Priority of stabilization tasks
  interruptsCurrent: boolean; // Interrupts current tasks of stabilization team

  // Defaults
  defaultReviewEffortPercent?: number; // Default review effort as % of dev effort
  defaultCorrectionDays?: number; // Default stabilization days

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

// Scheduling strategy for tasks at the same dependency level
export type SchedulingStrategy =
  | 'file-order' // Respect order from input file (default)
  | 'priority-first' // High priority first, then file order
  | 'longest-first' // Longest duration first (LPT algorithm)
  | 'shortest-first'; // Shortest duration first (SPT algorithm)

// Validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
