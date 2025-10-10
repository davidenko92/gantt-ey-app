import { useCallback } from 'react';
import { dateUtils } from '../features/gantt/utils/dateUtils';
import { Task, User } from '../types';

interface UseTaskSchedulerOptions {
  onScheduled: (scheduledTasks: Task[]) => void;
  onError: (message: string) => void;
}

export const useTaskScheduler = ({ onScheduled, onError }: UseTaskSchedulerOptions) => {
  const scheduleTasks = useCallback(
    (tasks: Task[], users: User[], startDate: Date) => {
      if (tasks.length === 0 || users.length === 0) {
        onError('Necesitas tareas y usuarios');
        return;
      }

      // Inicializar workload de usuarios
      const userWorkload: Record<string, { nextDate: Date; totalDays: number }> = {};
      users.forEach((user) => {
        userWorkload[user.name] = { nextDate: new Date(startDate), totalDays: 0 };
      });

      // Asignar tareas balanceando carga
      const scheduled = tasks.map((task) => {
        // Encontrar usuario con menor carga
        const availableUser = users.reduce((min, curr) => {
          const minLoad = userWorkload[min.name];
          const currLoad = userWorkload[curr.name];
          return minLoad.totalDays <= currLoad.totalDays ? min : curr;
        });

        // Calcular fechas de la tarea
        const taskStart = new Date(userWorkload[availableUser.name].nextDate);
        const taskEnd = dateUtils.addWorkingDays(taskStart, task.effort, availableUser);

        // Actualizar workload del usuario
        userWorkload[availableUser.name].totalDays += task.effort;
        const nextDay = new Date(taskEnd);
        nextDay.setDate(nextDay.getDate() + 1);
        userWorkload[availableUser.name].nextDate = nextDay;

        return {
          ...task,
          assignedUser: availableUser.name,
          startDate: taskStart,
          endDate: taskEnd,
        };
      });

      onScheduled(scheduled);
    },
    [onScheduled, onError]
  );

  return {
    scheduleTasks,
  };
};
