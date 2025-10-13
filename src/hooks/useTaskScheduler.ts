import { useCallback } from 'react';
import { dateUtils } from '@features/gantt/utils/dateUtils';
import { calculateEffortByUser } from '@features/gantt/services/effortCalculator';
import { Task, User } from '@types';

interface UseTaskSchedulerOptions {
  onScheduled: (scheduledTasks: Task[]) => void;
  onError: (message: string) => void;
  onWarning?: (message: string) => void;
}

export const useTaskScheduler = ({ onScheduled, onError, onWarning }: UseTaskSchedulerOptions) => {
  const scheduleTasks = useCallback(
    (tasks: Task[], users: User[], startDate: Date) => {
      if (tasks.length === 0 || users.length === 0) {
        onError('Necesitas tareas y usuarios');
        return;
      }

      // Check for tasks without assigned users
      const unassignedTasks = tasks.filter((t) => t.assignedUsers.length === 0);
      if (unassignedTasks.length > 0 && onWarning) {
        onWarning(
          `⚠️ ${unassignedTasks.length} tarea(s) sin asignar serán asignadas automáticamente al primer usuario disponible`
        );
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

      // Sort tasks by priority: Alta -> Media -> Baja
      const priorityOrder = { Alta: 1, Media: 2, Baja: 3 };
      const sortedTasks = [...tasks].sort((a, b) => {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      // Initialize user workload
      const userWorkload: Record<string, { nextDate: Date; totalDays: number }> = {};
      users.forEach((user) => {
        userWorkload[user.name] = { nextDate: new Date(startDate), totalDays: 0 };
      });

      const scheduled: Task[] = [];

      sortedTasks.forEach((task) => {
        let taskAssignedUsers = [...task.assignedUsers];

        // Auto-assign unassigned tasks to first available user
        if (taskAssignedUsers.length === 0) {
          const availableUser = users.reduce((min, curr) => {
            const minLoad = userWorkload[min.name];
            const currLoad = userWorkload[curr.name];
            return minLoad.totalDays <= currLoad.totalDays ? min : curr;
          });
          taskAssignedUsers = [availableUser.name];
        }

        // Calculate effort for each assigned user (with division + multipliers)
        const effortByUser = calculateEffortByUser(task.effortBase, taskAssignedUsers, users);

        // Create a scheduled task for each assigned user
        taskAssignedUsers.forEach((userName) => {
          const user = users.find((u) => u.name === userName);
          if (!user) return;

          const userEffort = effortByUser[userName] || task.effortBase;

          // Calculate task dates based on user's availability
          const taskStart = new Date(userWorkload[userName].nextDate);
          const taskEnd = dateUtils.addWorkingDays(taskStart, userEffort, user);

          // Update user workload
          userWorkload[userName].totalDays += userEffort;
          const nextDay = new Date(taskEnd);
          nextDay.setDate(nextDay.getDate() + 1);
          userWorkload[userName].nextDate = nextDay;

          // Create scheduled task (one per user)
          scheduled.push({
            ...task,
            assignedUsers: [userName], // Single user for this scheduled instance
            effortByUser: { [userName]: userEffort },
            startDate: taskStart,
            endDate: taskEnd,
          });
        });
      });

      onScheduled(scheduled);
    },
    [onScheduled, onError, onWarning]
  );

  return {
    scheduleTasks,
  };
};
