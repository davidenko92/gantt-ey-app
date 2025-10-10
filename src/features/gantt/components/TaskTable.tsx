import React from 'react';
import { EY_COLORS } from '@features/gantt/constants';
import { Task, User } from '@types';

interface TaskTableProps {
  tasks: Task[];
  scheduledTasks: Task[];
  users: User[];
}

export const TaskTable: React.FC<TaskTableProps> = ({ tasks, scheduledTasks, users }) => {
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
                Asignado
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task, idx) => {
              const scheduled = scheduledTasks.find((st) => st.id === task.id);
              const user = users.find((u) => u.name === scheduled?.assignedUser);

              return (
                <tr key={idx} className="border-t border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono" style={{ color: EY.black }}>
                    {task.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: EY.black }}>
                    {task.effort} días
                  </td>
                  <td className="px-4 py-3">
                    {scheduled?.assignedUser ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded"
                          style={{ backgroundColor: user?.color || EY.gray }}
                        ></div>
                        <span style={{ color: EY.black }}>{scheduled.assignedUser}</span>
                      </div>
                    ) : (
                      <span className="italic" style={{ color: EY.gray }}>
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
