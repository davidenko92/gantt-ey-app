import React from 'react';
import { Calendar } from 'lucide-react';
import { EY_COLORS } from '../constants';
import { Task, User } from '../../../types';

interface UserSummaryProps {
  scheduledTasks: Task[];
  users: User[];
}

export const UserSummary: React.FC<UserSummaryProps> = ({ scheduledTasks, users }) => {
  const EY = EY_COLORS;

  if (scheduledTasks.length === 0) return null;

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6 mb-6"
      style={{ borderTop: `4px solid ${EY.yellow}` }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: EY.black }}>
        Resumen de Carga por Usuario
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const userTasks = scheduledTasks.filter((task) => task.assignedUser === user.name);
          const totalDays = userTasks.reduce((sum, task) => sum + task.effort, 0);

          return (
            <div
              key={user.id}
              className="border-2 rounded-lg p-4 shadow-sm"
              style={{ borderColor: EY.yellow }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-5 h-5 rounded" style={{ backgroundColor: user.color }}></div>
                <h4 className="font-semibold" style={{ color: EY.black }}>
                  {user.name}
                </h4>
              </div>
              <div className="text-sm space-y-1" style={{ color: EY.gray }}>
                <p>{userTasks.length} tareas asignadas</p>
                <p>{totalDays} días de trabajo total</p>
                {user.vacations.length > 0 && (
                  <p className="text-orange-600">
                    <Calendar size={12} className="inline mr-1" />
                    {user.vacations.length} días de vacaciones
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
