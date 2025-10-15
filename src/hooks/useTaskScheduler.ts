import { useCallback } from 'react';
import { dateUtils } from '@features/gantt/utils/dateUtils';
import { expandTasksWithTeams } from '@features/gantt/services/taskExpander';
import { validateTeamDependencies } from '@features/gantt/services/dependencyValidator';
import {
  applyChildLockDependencies,
  recalculateTaskDates,
  validateTaskDependencies,
} from '@features/gantt/services/dependencyResolver';
import { Task, User, Team, SchedulingStrategy } from '@types';

interface UseTaskSchedulerOptions {
  onScheduled: (scheduledTasks: Task[]) => void;
  onError: (message: string) => void;
  onWarning?: (message: string) => void;
}

/**
 * Topological sort for tasks based on dependencies
 * Ensures tasks are ordered so that all dependencies come before dependents
 * Applies scheduling strategy for tasks at the same dependency level
 */
const topologicalSort = (tasks: Task[], strategy: SchedulingStrategy = 'file-order'): Task[] => {
  const priorityOrder = { Alta: 1, Media: 2, Baja: 3 };
  const sorted: Task[] = [];
  const visited = new Set<string>();
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Helper function for depth-first traversal
  const visit = (task: Task) => {
    if (visited.has(task.id)) return;
    visited.add(task.id);

    // Visit all dependencies first
    if (task.dependsOn && task.dependsOn.length > 0) {
      // Sort dependencies based on strategy before visiting
      const deps = task.dependsOn
        .map((depId) => taskMap.get(depId))
        .filter((t): t is Task => t !== undefined);

      const sortedDeps = sortTasksByStrategy(deps, strategy);

      sortedDeps.forEach((depTask) => {
        visit(depTask);
      });
    }

    // Add current task after all dependencies
    sorted.push(task);
  };

  // Sort tasks by strategy before visiting (respects file order as base)
  const sortedInput = sortTasksByStrategy([...tasks], strategy);

  // Visit all tasks in sorted order
  sortedInput.forEach((task) => {
    if (!visited.has(task.id)) {
      visit(task);
    }
  });

  return sorted;
};

/**
 * Sorts tasks based on the selected strategy
 * Preserves file order as base, applies strategy as secondary sort
 */
function sortTasksByStrategy(tasks: Task[], strategy: SchedulingStrategy): Task[] {
  const priorityOrder = { Alta: 1, Media: 2, Baja: 3 };

  // Add original index to preserve file order
  const tasksWithIndex = tasks.map((task, index) => ({ task, originalIndex: index }));

  switch (strategy) {
    case 'priority-first':
      tasksWithIndex.sort((a, b) => {
        const priorityDiff = priorityOrder[a.task.priority] - priorityOrder[b.task.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.originalIndex - b.originalIndex; // Preserve file order for same priority
      });
      break;

    case 'longest-first':
      tasksWithIndex.sort((a, b) => {
        const durationA = a.task.effortBase;
        const durationB = b.task.effortBase;
        if (durationB !== durationA) return durationB - durationA; // Longest first
        return a.originalIndex - b.originalIndex; // Preserve file order for same duration
      });
      break;

    case 'shortest-first':
      tasksWithIndex.sort((a, b) => {
        const durationA = a.task.effortBase;
        const durationB = b.task.effortBase;
        if (durationA !== durationB) return durationA - durationB; // Shortest first
        return a.originalIndex - b.originalIndex; // Preserve file order for same duration
      });
      break;

    case 'file-order':
    default:
      // Keep original order
      tasksWithIndex.sort((a, b) => a.originalIndex - b.originalIndex);
      break;
  }

  return tasksWithIndex.map((item) => item.task);
}

export const useTaskScheduler = ({ onScheduled, onError, onWarning }: UseTaskSchedulerOptions) => {
  const scheduleTasks = useCallback(
    (
      tasks: Task[],
      users: User[],
      teams: Team[],
      startDate: Date,
      strategy: SchedulingStrategy = 'file-order'
    ) => {
      // Validations
      if (tasks.length === 0 || users.length === 0) {
        onError('Necesitas tareas y usuarios');
        return;
      }

      // Validate team dependencies
      const teamValidation = validateTeamDependencies(teams);
      if (!teamValidation.valid) {
        onError(`Configuración de equipos inválida:\n${teamValidation.errors.join('\n')}`);
        return;
      }

      // Validate that assigned users exist
      const validUsers = new Set(users.map((u) => u.name));
      const invalidAssignments: string[] = [];
      tasks.forEach((task) => {
        task.assignedUsers.forEach((userName) => {
          if (!validUsers.has(userName)) {
            invalidAssignments.push(`Tarea "${task.name}": usuario "${userName}" no existe`);
          }
        });
      });

      if (invalidAssignments.length > 0) {
        onError(`Usuarios no encontrados:\n${invalidAssignments.join('\n')}`);
        return;
      }

      // Apply strategy to original tasks BEFORE expansion
      const sortedOriginalTasks = sortTasksByStrategy([...tasks], strategy);

      // Expand tasks into workflow phases (dev, review, correction)
      const expandedTasks = expandTasksWithTeams(sortedOriginalTasks, teams);

      // Apply child-lock dependencies: ancestors cannot start until ALL descendants complete
      const tasksWithChildLock = applyChildLockDependencies(expandedTasks);

      // Sort by dependencies only (topological sort)
      // Don't apply strategy here because it was already applied to original tasks
      const sortedTasks = topologicalSort(tasksWithChildLock, 'file-order');

      // Initialize user workload per team
      const userWorkload: Record<
        string,
        { nextDate: Date; totalDays: number; currentTask: Task | null }
      > = {};
      users.forEach((user) => {
        userWorkload[user.name] = {
          nextDate: new Date(startDate),
          totalDays: 0,
          currentTask: null,
        };
      });

      // Track task completion status
      const completedTasks = new Set<string>();
      const scheduled: Task[] = [];
      const blocked: Task[] = [];

      // Helper to check if dependencies are met
      const canStartTask = (task: Task): boolean => {
        if (!task.dependsOn || task.dependsOn.length === 0) return true;

        return task.dependsOn.every((depId) => completedTasks.has(depId));
      };

      // Helper to get earliest start date considering dependencies
      // STRICT: Task can only start AFTER all dependencies are complete
      const getEarliestStartDate = (task: Task, userName: string): Date => {
        let earliestDate = new Date(userWorkload[userName].nextDate);

        if (task.dependsOn && task.dependsOn.length > 0) {
          // Find the latest end date among ALL dependencies
          let latestDepEnd: Date | null = null;

          task.dependsOn.forEach((depId) => {
            const depTask = scheduled.find((t) => t.id === depId);
            if (depTask && depTask.endDate) {
              if (!latestDepEnd || depTask.endDate > latestDepEnd) {
                latestDepEnd = depTask.endDate;
              }
            }
          });

          // Task can only start the day AFTER the last dependency ends
          if (latestDepEnd) {
            // Get next WORKING day after dependency completes (no user-specific vacations)
            const dayAfterLatestDep = dateUtils.getNextWorkingDay(latestDepEnd);

            // Use the later of: user availability or dependency completion
            earliestDate = dayAfterLatestDep > earliestDate ? dayAfterLatestDep : earliestDate;
          }
        }

        return earliestDate;
      };

      // Schedule tasks considering dependencies and parallel execution
      let pendingTasks = [...sortedTasks];
      let maxIterations = 1000; // Safety limit
      let iteration = 0;

      while (pendingTasks.length > 0 && iteration < maxIterations) {
        iteration++;
        let progressMade = false;

        for (let i = pendingTasks.length - 1; i >= 0; i--) {
          const task = pendingTasks[i];

          // Check if task can start
          if (!canStartTask(task)) {
            continue;
          }

          // Get assigned user
          const userName = task.assignedUsers[0];
          if (!userName) {
            onWarning?.(`Tarea ${task.id} sin usuario asignado, omitiendo`);
            pendingTasks.splice(i, 1);
            progressMade = true;
            continue;
          }

          const user = users.find((u) => u.name === userName);
          if (!user) {
            onWarning?.(`Usuario ${userName} no encontrado para tarea ${task.id}`);
            pendingTasks.splice(i, 1);
            progressMade = true;
            continue;
          }

          const userEffort = task.effortByUser?.[userName] || task.effortBase;

          // Handle task interruption
          if (task.interruptsCurrent && userWorkload[userName].currentTask) {
            // Interrupt current task, schedule interrupting task first
            const currentTask = userWorkload[userName].currentTask;
            if (currentTask) {
              // Push interrupted task back to pending
              blocked.push(currentTask);
              userWorkload[userName].currentTask = null;
            }
          }

          // Calculate start date considering dependencies and user availability
          const earliestStart = getEarliestStartDate(task, userName);
          const taskStart =
            earliestStart > userWorkload[userName].nextDate
              ? earliestStart
              : userWorkload[userName].nextDate;

          const taskEnd = dateUtils.addWorkingDays(taskStart, userEffort, user);

          // Update user workload
          userWorkload[userName].totalDays += userEffort;
          // Get next WORKING day after task ends
          const nextWorkingDay = dateUtils.getNextWorkingDay(taskEnd, user);
          userWorkload[userName].nextDate = nextWorkingDay;
          userWorkload[userName].currentTask = task;

          // Schedule task
          scheduled.push({
            ...task,
            startDate: taskStart,
            endDate: taskEnd,
            status: 'pending',
          });

          // Mark as completed for dependency tracking
          completedTasks.add(task.id);

          // Remove from pending
          pendingTasks.splice(i, 1);
          progressMade = true;
        }

        // If no progress was made, we have circular dependencies or other issues
        if (!progressMade) {
          const remainingTaskIds = pendingTasks.map((t) => t.id).join(', ');
          onError(
            `No se pueden programar las siguientes tareas (posible dependencia circular): ${remainingTaskIds}`
          );
          break;
        }
      }

      if (iteration >= maxIterations) {
        onError('Error: demasiadas iteraciones al programar tareas');
      }

      // Sort by start date
      let sortedScheduled = scheduled.sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        return a.startDate.getTime() - b.startDate.getTime();
      });

      // Recalculate dates based on dependencies to ensure correctness
      try {
        sortedScheduled = recalculateTaskDates(sortedScheduled);
      } catch (error) {
        onError(
          `Error recalculando fechas: ${error instanceof Error ? error.message : 'Error desconocido'}`
        );
        return;
      }

      // Validate dependencies before returning
      const validation = validateTaskDependencies(sortedScheduled);
      if (!validation.valid) {
        onError(`Validación de dependencias falló:\n${validation.errors.join('\n')}`);
        return;
      }

      onScheduled(sortedScheduled);
    },
    [onScheduled, onError, onWarning]
  );

  return {
    scheduleTasks,
  };
};
