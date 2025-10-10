import React from 'react';
import { EY_COLORS } from '../constants';
import { Task, User } from '../../../types';

interface GanttChartProps {
  scheduledTasks: Task[];
  users: User[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ scheduledTasks, users }) => {
  const EY = EY_COLORS;

  if (!scheduledTasks.length) return null;

  // Calcular rango de fechas
  const dates = scheduledTasks.reduce((acc, task) => {
    if (task.startDate) acc.push(task.startDate);
    if (task.endDate) acc.push(task.endDate);
    return acc;
  }, [] as Date[]);

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6"
      style={{ borderTop: `4px solid ${EY.yellow}` }}
    >
      <h3 className="text-xl font-bold mb-4" style={{ color: EY.black }}>
        Diagrama de Gantt
      </h3>

      <div className="overflow-auto">
        {/* Header de fechas */}
        <div className="flex mb-4">
          <div className="w-64 flex-shrink-0"></div>
          <div className="flex">
            {Array.from({ length: totalDays }, (_, i) => {
              const date = new Date(minDate);
              date.setDate(date.getDate() + i);
              return (
                <div key={i} className="text-xs text-center border-l border-gray-200 w-10">
                  {date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Barras de tareas */}
        <div className="space-y-2">
          {scheduledTasks.map((task, idx) => {
            if (!task.startDate || !task.endDate) return null;

            const user = users.find((u) => u.name === task.assignedUser);
            const startOffset = Math.floor(
              (task.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            const duration =
              Math.floor(
                (task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;

            return (
              <div key={idx} className="flex items-center">
                <div className="w-64 text-sm font-medium pr-4" style={{ color: EY.black }}>
                  {task.name}
                </div>
                <div className="relative flex">
                  <div
                    className="h-6 rounded flex items-center justify-center text-xs font-medium shadow-sm"
                    style={{
                      backgroundColor: user?.color || EY.gray,
                      marginLeft: startOffset * 40,
                      width: duration * 40,
                      minWidth: 80,
                      color: user?.color === EY.yellow ? EY.black : EY.white,
                    }}
                  >
                    {task.assignedUser?.split(' ')[0]} - {task.effort}d
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda de usuarios */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-semibold mb-2" style={{ color: EY.black }}>
            Usuarios:
          </h4>
          <div className="flex flex-wrap gap-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: user.color }}></div>
                <span className="text-sm" style={{ color: EY.black }}>
                  {user.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
