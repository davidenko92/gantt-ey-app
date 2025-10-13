import React from 'react';
import { Calendar, Shield } from 'lucide-react';
import { EY_COLORS } from '@features/gantt/constants';
import { Task, User, Team } from '@types';

interface UserSummaryProps {
  scheduledTasks: Task[];
  users: User[];
  teams: Team[];
}

export const UserSummary: React.FC<UserSummaryProps> = ({ scheduledTasks, users, teams }) => {
  const EY = EY_COLORS;

  if (scheduledTasks.length === 0) return null;

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6 mb-6"
      style={{ borderTop: `4px solid ${EY.yellow}` }}
    >
      <h3 className="text-lg font-semibold mb-6" style={{ color: EY.black }}>
        Resumen de Carga por Equipo y Usuario
      </h3>

      <div className="space-y-8">
        {teams.map((team) => {
          const teamUsers = users.filter((u) => team.users.some((tu) => tu.id === u.id));

          if (teamUsers.length === 0) return null;

          return (
            <div key={team.id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: team.color + '20', color: team.color }}
                >
                  <Shield size={20} />
                </div>
                <h4 className="text-lg font-semibold" style={{ color: EY.black }}>
                  {team.name}
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-4">
                {teamUsers.map((user) => {
                  // Filter tasks where this user is assigned
                  const userTasks = scheduledTasks.filter((task) =>
                    task.assignedUsers.includes(user.name)
                  );

                  // Calculate total effort for this user
                  const totalDays = userTasks.reduce((sum, task) => {
                    return sum + (task.effortByUser?.[user.name] || 0);
                  }, 0);

                  // Count tasks by type
                  const taskTypeCount = {
                    development: userTasks.filter((t) => t.taskType === 'development').length,
                    review: userTasks.filter((t) => t.taskType === 'review').length,
                    correction: userTasks.filter((t) => t.taskType === 'correction').length,
                  };

                  // Count by priority
                  const priorityCount = {
                    Alta: userTasks.filter((t) => t.priority === 'Alta').length,
                    Media: userTasks.filter((t) => t.priority === 'Media').length,
                    Baja: userTasks.filter((t) => t.priority === 'Baja').length,
                  };

                  // Category badge color
                  const categoryColor = user.category === 'Senior' ? '#10B981' : '#3B82F6';

                  return (
                    <div
                      key={user.id}
                      className="border-2 rounded-lg p-4 shadow-sm"
                      style={{ borderColor: team.color + '40' }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: user.color }}
                        ></div>
                        <h5 className="font-semibold text-sm" style={{ color: EY.black }}>
                          {user.name}
                        </h5>
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: categoryColor }}
                        >
                          {user.category}
                        </span>
                      </div>

                      <div className="text-sm space-y-2" style={{ color: EY.gray }}>
                        <p className="font-medium">{userTasks.length} tareas</p>
                        <p className="font-medium">{totalDays.toFixed(1)} días totales</p>

                        {/* Task types */}
                        {(taskTypeCount.development > 0 ||
                          taskTypeCount.review > 0 ||
                          taskTypeCount.correction > 0) && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {taskTypeCount.development > 0 && (
                              <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                                {taskTypeCount.development} Dev
                              </span>
                            )}
                            {taskTypeCount.review > 0 && (
                              <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                                {taskTypeCount.review} Rev
                              </span>
                            )}
                            {taskTypeCount.correction > 0 && (
                              <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                                {taskTypeCount.correction} Corr
                              </span>
                            )}
                          </div>
                        )}

                        {/* Priorities */}
                        <div className="flex flex-wrap gap-1">
                          {priorityCount.Alta > 0 && (
                            <span
                              className="px-2 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: '#DC2626' }}
                            >
                              {priorityCount.Alta} Alta
                            </span>
                          )}
                          {priorityCount.Media > 0 && (
                            <span
                              className="px-2 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: '#F59E0B' }}
                            >
                              {priorityCount.Media} Media
                            </span>
                          )}
                          {priorityCount.Baja > 0 && (
                            <span
                              className="px-2 py-1 rounded text-xs font-semibold text-white"
                              style={{ backgroundColor: '#10B981' }}
                            >
                              {priorityCount.Baja} Baja
                            </span>
                          )}
                        </div>

                        {user.vacations.length > 0 && (
                          <p className="text-orange-600 mt-2 text-xs">
                            <Calendar size={12} className="inline mr-1" />
                            {user.vacations.length} días vacaciones
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
