import React from 'react';
import { EY_COLORS } from '@features/gantt/constants';
import { Task, User, Priority } from '@types';

interface TaskTableProps {
  tasks: Task[];
  scheduledTasks: Task[];
  users: User[];
  onUpdatePriority: (taskId: string, newPriority: Priority) => void;
}

export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  scheduledTasks,
  users,
  onUpdatePriority,
}) => {
  const EY = EY_COLORS;

  if (tasks.length === 0) return null;

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
                Esfuerzo
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Prioridad
              </th>
              <th className="px-4 py-3 text-left font-semibold" style={{ color: EY.black }}>
                Asignado
              </th>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
