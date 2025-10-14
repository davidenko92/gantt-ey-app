import { useCallback } from 'react';
import { dateUtils } from '@features/gantt/utils/dateUtils';
import { expandTasksWithTeams } from '@features/gantt/services/taskExpander';
import { validateTeamDependencies } from '@features/gantt/services/dependencyValidator';
import { Task, User, Team } from '@types';

interface UseTaskSchedulerOptions {
  onScheduled: (scheduledTasks: Task[]) => void;
  onError: (message: string) => void;
  onWarning?: (message: string) => void;
}

/**
 * Topological sort for tasks based on dependencies
 * Ensures tasks are ordered so that all dependencies come before dependents
 * Also respects priority within each dependency level
 */
const topologicalSort = (tasks: Task[]): Task[] => {
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
      task.dependsOn.forEach((depId) => {
        const depTask = taskMap.get(depId);
        if (depTask) {
          visit(depTask);
        }
      });
    }

    // Add current task after all dependencies
    sorted.push(task);
  };

  // Visit all tasks
  tasks.forEach((task) => {
    if (!visited.has(task.id)) {
      visit(task);
    }
  });

  // Within tasks at the same dependency level, sort by priority
  // This is done by grouping tasks by their "depth" in the dependency tree
  return sorted;
};

export const useTaskScheduler = ({ onScheduled, onError, onWarning }: UseTaskSchedulerOptions) => {
  const scheduleTasks = useCallback(
    (tasks: Task[], users: User[], teams: Team[], startDate: Date) => {
      // Validations
      if (tasks.length === 0 || users.length === 0) {
        onError('Necesitas tareas y usuarios');
        return;
      }

      // Validate team dependencies
      const validation = validateTeamDependencies(teams);
      if (!validation.valid) {
        onError(`Configuración de equipos inválida:\n${validation.errors.join('\n')}`);
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

      // Expand tasks into workflow phases (dev, review, correction)
      const expandedTasks = expandTasksWithTeams(tasks, teams);

      // Sort by dependencies first (topological sort), then by priority
      const sortedTasks = topologicalSort(expandedTasks);

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
      const sortedScheduled = scheduled.sort((a, b) => {
        if (!a.startDate || !b.startDate) return 0;
        return a.startDate.getTime() - b.startDate.getTime();
      });

      onScheduled(sortedScheduled);
    },
    [onScheduled, onError, onWarning]
  );

  return {
    scheduleTasks,
  };
};
