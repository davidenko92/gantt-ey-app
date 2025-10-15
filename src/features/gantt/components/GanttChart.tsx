import React from 'react';
import { EY_COLORS } from '@features/gantt/constants';
import { Task, User, Team } from '@types';

interface GanttChartProps {
  scheduledTasks: Task[];
  users: User[];
  teams: Team[];
}

export const GanttChart: React.FC<GanttChartProps> = ({ scheduledTasks, users, teams }) => {
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

  // Generate array of business days only (Monday-Friday)
  const businessDays: Date[] = [];
  const currentDate = new Date(minDate);

  while (currentDate <= maxDate) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays.push(new Date(currentDate));
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Create a map to find the position of each date in the business days array
  const dateToPosition = new Map<string, number>();
  businessDays.forEach((date, index) => {
    dateToPosition.set(date.toDateString(), index);
  });

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
            {businessDays.map((date, i) => {
              return (
                <div
                  key={i}
                  className="text-xs text-center border-l border-gray-200"
                  style={{ width: '40px' }}
                >
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

            // Get the user assigned to this task instance
            const userName = task.assignedUsers[0]; // Each scheduled task has one user
            const user = users.find((u) => u.name === userName);
            const userEffort = task.effortByUser?.[userName] || 0;

            // Calculate position based on business days only
            const startPosition = dateToPosition.get(task.startDate.toDateString()) ?? 0;
            const endPosition = dateToPosition.get(task.endDate.toDateString()) ?? 0;
            const duration = endPosition - startPosition + 1;

            // Get task type styling
            const getTaskTypeStyle = () => {
              const team = teams.find((t) => t.id === task.team);

              if (task.taskType === 'development') {
                return {
                  backgroundColor: user?.color || EY.gray,
                  pattern: 'solid',
                  border: 'none',
                };
              } else if (task.taskType === 'review') {
                return {
                  backgroundColor: team?.color || '#8B5CF6',
                  pattern: 'diagonal-lines',
                  border: `2px solid ${team?.color || '#8B5CF6'}`,
                };
              } else if (task.taskType === 'stabilization') {
                // Stabilization tasks use the assigned user's color (developer)
                return {
                  backgroundColor: user?.color || '#10B981',
                  pattern: 'dots',
                  border: `2px dashed ${user?.color || '#10B981'}`,
                };
              }
              return {
                backgroundColor: EY.gray,
                pattern: 'solid',
                border: 'none',
              };
            };

            const taskStyle = getTaskTypeStyle();

            return (
              <div key={idx} className="flex items-center">
                <div className="w-64 text-sm font-medium pr-4" style={{ color: EY.black }}>
                  {task.name}
                </div>
                <div className="flex" style={{ position: 'relative' }}>
                  {/* Task bar positioned absolutely */}
                  <div
                    className="h-6 rounded flex items-center justify-center text-xs font-medium shadow-sm overflow-hidden px-2"
                    style={{
                      position: 'absolute',
                      left: `${startPosition * 40}px`,
                      backgroundColor: taskStyle.backgroundColor,
                      border: taskStyle.border,
                      width: `${duration * 40}px`,
                      color: '#FFFFFF',
                      opacity: task.taskType === 'review' ? 0.85 : 1,
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                    }}
                    title={`${userName}: ${task.name} - ${userEffort}d`}
                  >
                    {userName}: {task.name} - {userEffort}d
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Leyenda */}
        <div className="mt-6 pt-4 border-t space-y-4">
          <div>
            <h4 className="font-semibold mb-2" style={{ color: EY.black }}>
              Usuarios:
            </h4>
            <div className="flex flex-wrap gap-4">
              {users.map((user) => {
                const categoryColor = user.category === 'Senior' ? '#10B981' : '#3B82F6';
                return (
                  <div key={user.id} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: user.color }}></div>
                    <span className="text-sm" style={{ color: EY.black }}>
                      {user.name}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {user.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2" style={{ color: EY.black }}>
              Equipos:
            </h4>
            <div className="flex flex-wrap gap-4">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded" style={{ backgroundColor: team.color }}></div>
                  <span className="text-sm" style={{ color: EY.black }}>
                    {team.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2" style={{ color: EY.black }}>
              Tipos de Tarea:
            </h4>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                <span className="text-sm" style={{ color: EY.black }}>
                  Desarrollo
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-4 rounded"
                  style={{ backgroundColor: '#8B5CF6', border: '2px solid #8B5CF6', opacity: 0.85 }}
                ></div>
                <span className="text-sm" style={{ color: EY.black }}>
                  Revisión
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-4 rounded"
                  style={{ backgroundColor: '#10B981', border: '2px dashed #10B981' }}
                ></div>
                <span className="text-sm" style={{ color: EY.black }}>
                  Estabilización
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
