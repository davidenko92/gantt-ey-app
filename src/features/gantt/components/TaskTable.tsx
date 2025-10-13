import React from 'react';
import { EY_COLORS } from '@features/gantt/constants';
import { Task, User, Priority, Team, TaskTeamEffort } from '@types';
import { MultiSelect } from '@components/ui/MultiSelect';
import { getDefaultTeamEffort } from '@features/gantt/services/taskExpander';

interface TaskTableProps {
  tasks: Task[];
  scheduledTasks: Task[];
  users: User[];
  teams: Team[];
  onUpdatePriority: (taskId: string, newPriority: Priority) => void;
  onUpdateTaskTeamEffort: (taskId: string, teamId: string, effort: Partial<TaskTeamEffort>) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  scheduledTasks,
  users,
  teams,
  onUpdatePriority,
  onUpdateTaskTeamEffort,
}) => {
  const EY = EY_COLORS;

  if (tasks.length === 0) return null;

  const nonDevTeams = teams.filter((t) => t.id !== 'dev');

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6 mb-6"
      style={{ borderTop: `4px solid ${EY.yellow}` }}
    >
      <h3 className="text-lg font-semibold mb-4" style={{ color: EY.black }}>
        Tareas Cargadas ({tasks.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead style={{ backgroundColor: EY.lightGray }}>
            <tr>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Tarea
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Esfuerzo Dev
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Prioridad
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Desarrolladores
              </th>
              {nonDevTeams.map((team) => (
                <th
                  key={team.id}
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: team.color, borderLeft: `2px solid ${team.color}40` }}
                >
                  {team.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => {
              // Find all scheduled instances of this task
              const scheduledInstances = scheduledTasks.filter((st) => st.id === task.id);

              const priorityColor =
                task.priority === 'Alta'
                  ? '#DC2626'
                  : task.priority === 'Media'
                    ? '#F59E0B'
                    : '#10B981';

              return (
                <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono" style={{ color: EY.black }}>
                    {task.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: EY.black }}>
                    {task.effortBase} días
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={task.priority}
                      onChange={(e) => onUpdatePriority(task.id, e.target.value as Priority)}
                      className="px-2 py-1 rounded text-xs font-semibold text-white border-none cursor-pointer"
                      style={{ backgroundColor: priorityColor }}
                    >
                      <option value="Alta" style={{ backgroundColor: '#DC2626' }}>
                        Alta
                      </option>
                      <option value="Media" style={{ backgroundColor: '#F59E0B' }}>
                        Media
                      </option>
                      <option value="Baja" style={{ backgroundColor: '#10B981' }}>
                        Baja
                      </option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignedUsers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {task.assignedUsers.map((userName, userIdx) => {
                          const user = users.find((u) => u.name === userName);
                          const scheduledInstance = scheduledInstances.find(
                            (si) => si.assignedUsers[0] === userName
                          );
                          const userEffort = scheduledInstance?.effortByUser?.[userName];

                          return (
                            <div
                              key={userIdx}
                              className="flex items-center gap-1 px-2 py-1 rounded"
                              style={{ backgroundColor: EY.lightGray }}
                            >
                              <div
                                className="w-3 h-3 rounded"
                                style={{ backgroundColor: user?.color || EY.gray }}
                              ></div>
                              <span className="text-xs font-medium" style={{ color: EY.black }}>
                                {userName}
                                {userEffort && ` (${userEffort}d)`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : scheduledInstances.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{
                            backgroundColor:
                              users.find((u) => u.name === scheduledInstances[0].assignedUsers[0])
                                ?.color || EY.gray,
                          }}
                        ></div>
                        <span className="text-xs" style={{ color: EY.black }}>
                          {scheduledInstances[0].assignedUsers[0]} (auto-asignado)
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-xs" style={{ color: EY.gray }}>
                        Sin asignar
                      </span>
                    )}
                  </td>

                  {/* Columnas dinámicas por equipo */}
                  {nonDevTeams.map((team) => {
                    const teamEffort = task.teamEfforts[team.id] || getDefaultTeamEffort(task, team);
                    const teamUsers = team.users;

                    return (
                      <td
                        key={team.id}
                        className="px-4 py-3 align-top"
                        style={{ borderLeft: `2px solid ${team.color}40` }}
                      >
                        <div className="space-y-3 min-w-[200px]">
                          {/* Checkbox para habilitar */}
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={teamEffort.enabled}
                              onChange={(e) =>
                                onUpdateTaskTeamEffort(task.id, team.id, {
                                  enabled: e.target.checked,
                                })
                              }
                              className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                              style={{ accentColor: team.color }}
                            />
                            <span className="text-xs font-medium">Habilitar</span>
                          </label>

                          {teamEffort.enabled && (
                            <>
                              {/* Esfuerzo de revisión */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: EY.gray }}>
                                  Revisión (días)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={teamEffort.reviewEffort}
                                  onChange={(e) =>
                                    onUpdateTaskTeamEffort(task.id, team.id, {
                                      reviewEffort: parseFloat(e.target.value) || 0,
                                    })
                                  }
                                  className="w-full border-2 rounded px-2 py-1 text-xs focus:outline-none"
                                  style={{ borderColor: team.color }}
                                />
                              </div>

                              {/* Revisores */}
                              <div>
                                <label className="block text-xs font-medium mb-1" style={{ color: EY.gray }}>
                                  Revisores
                                </label>
                                <MultiSelect
                                  options={teamUsers}
                                  selected={teamEffort.reviewAssignedUsers}
                                  onChange={(selectedNames) =>
                                    onUpdateTaskTeamEffort(task.id, team.id, {
                                      reviewAssignedUsers: selectedNames,
                                    })
                                  }
                                  placeholder="Auto-asignar"
                                  size="sm"
                                />
                              </div>

                              {/* Corrección (si está configurado) */}
                              {team.config.triggersCorrection && (
                                <>
                                  <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: EY.gray }}>
                                      Corrección (días)
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.5"
                                      value={teamEffort.correctionEffort}
                                      onChange={(e) =>
                                        onUpdateTaskTeamEffort(task.id, team.id, {
                                          correctionEffort: parseFloat(e.target.value) || 0,
                                        })
                                      }
                                      className="w-full border-2 rounded px-2 py-1 text-xs focus:outline-none"
                                      style={{ borderColor: team.color }}
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-medium mb-1" style={{ color: EY.gray }}>
                                      Correctores
                                    </label>
                                    <MultiSelect
                                      options={
                                        teams.find((t) => t.id === team.config.correctionTeam)?.users ||
                                        []
                                      }
                                      selected={teamEffort.correctionAssignedUsers}
                                      onChange={(selectedNames) =>
                                        onUpdateTaskTeamEffort(task.id, team.id, {
                                          correctionAssignedUsers: selectedNames,
                                        })
                                      }
                                      placeholder="Originales"
                                      size="sm"
                                    />
                                  </div>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
