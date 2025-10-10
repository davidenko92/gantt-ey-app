import React from 'react';
import { Plus, Trash2, Calendar, Clock, Users, Settings } from 'lucide-react';
import { EY_COLORS } from '../constants';
import { User } from '../../../types';

interface ConfigPanelProps {
  startDate: Date;
  users: User[];
  onStartDateChange: (date: Date) => void;
  onAddUser: () => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  startDate,
  users,
  onStartDateChange,
  onAddUser,
  onUpdateUser,
  onRemoveUser,
  onNotify,
}) => {
  const EY = EY_COLORS;

  return (
    <div
      className="bg-white rounded-lg shadow-lg p-6 mb-6"
      style={{ borderTop: `6px solid ${EY.yellow}` }}
    >
      <h3
        className="text-xl font-semibold mb-6 flex items-center gap-2"
        style={{ color: EY.black }}
      >
        <Settings size={24} />
        Configuración
      </h3>

      <div className="space-y-8">
        {/* Fecha inicio */}
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: EY.black }}>
            <Clock size={18} />
            Fecha de Inicio
          </h4>
          <input
            type="date"
            value={startDate.toISOString().split('T')[0]}
            onChange={(e) => onStartDateChange(new Date(e.target.value))}
            className="border-2 rounded-lg px-4 py-3 max-w-md focus:outline-none"
            style={{ borderColor: EY.gray }}
          />
        </div>

        {/* Usuarios */}
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: EY.black }}>
            <Users size={18} />
            Gestión de Usuarios
          </h4>

          <button
            onClick={onAddUser}
            className="flex items-center gap-2 text-white px-6 py-3 rounded-lg hover:opacity-90 mb-6 shadow-md font-medium"
            style={{ backgroundColor: EY.black }}
          >
            <Plus size={18} />
            Agregar Usuario
          </button>

          <div className="space-y-6">
            {users.map((user) => (
              <div
                key={user.id}
                className="border-2 rounded-xl p-6 shadow-sm"
                style={{ borderColor: EY.yellow, backgroundColor: EY.lightGray }}
              >
                {/* Info básica */}
                <div className="flex items-center gap-4 mb-6">
                  <input
                    type="color"
                    value={user.color}
                    onChange={(e) => onUpdateUser(user.id, { color: e.target.value })}
                    className="w-16 h-16 rounded-xl border-2 cursor-pointer shadow-md"
                    style={{ borderColor: EY.gray }}
                  />
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => onUpdateUser(user.id, { name: e.target.value })}
                    className="flex-1 border-2 rounded-lg px-4 py-3 font-medium focus:outline-none"
                    style={{ borderColor: EY.gray }}
                    placeholder="Nombre del usuario"
                  />
                  <button
                    onClick={() => onRemoveUser(user.id)}
                    className="text-red-600 hover:text-red-700 p-3 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>

                {/* Vacaciones */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={18} style={{ color: EY.black }} />
                    <span className="font-semibold" style={{ color: EY.black }}>
                      Días de Vacaciones
                    </span>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <input
                      type="date"
                      className="flex-1 border-2 rounded-lg px-4 py-3 focus:outline-none"
                      style={{ borderColor: EY.gray }}
                      onChange={(e) => {
                        if (e.target.value) {
                          const newDate = new Date(e.target.value);
                          const exists = user.vacations.some(
                            (v) => v.toDateString() === newDate.toDateString()
                          );

                          if (!exists) {
                            const updated = [...user.vacations, newDate].sort(
                              (a, b) => a.getTime() - b.getTime()
                            );
                            onUpdateUser(user.id, { vacations: updated });
                          } else {
                            onNotify('Fecha ya agregada', 'error');
                          }
                          e.target.value = '';
                        }
                      }}
                    />
                    <button
                      className="px-6 py-3 rounded-lg font-medium hover:opacity-90 shadow-md"
                      style={{ backgroundColor: EY.yellow, color: EY.black }}
                    >
                      + Agregar
                    </button>
                  </div>

                  {user.vacations.length > 0 ? (
                    <div
                      className="bg-white rounded-lg border-2 p-4 max-h-48 overflow-y-auto"
                      style={{ borderColor: EY.yellow }}
                    >
                      {user.vacations.map((vacation, vIdx) => (
                        <div
                          key={vIdx}
                          className="flex justify-between items-center py-2 px-3 hover:bg-yellow-50 rounded border-l-4"
                          style={{ borderLeftColor: EY.yellow }}
                        >
                          <span
                            className="flex items-center gap-2 font-medium"
                            style={{ color: EY.black }}
                          >
                            <Calendar size={16} />
                            {vacation.toLocaleDateString('es-ES', {
                              weekday: 'long',
                              day: '2-digit',
                              month: 'long',
                            })}
                          </span>
                          <button
                            onClick={() => {
                              const updated = user.vacations.filter((_, i) => i !== vIdx);
                              onUpdateUser(user.id, { vacations: updated });
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100 rounded p-1"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="text-center py-8 text-sm italic border-2 border-dashed rounded-lg"
                      style={{
                        borderColor: EY.gray,
                        color: EY.gray,
                        backgroundColor: EY.white,
                      }}
                    >
                      No hay días de vacaciones
                    </div>
                  )}
                </div>
              </div>
            ))}

            {!users.length && (
              <div
                className="text-center py-12 border-2 border-dashed rounded-lg"
                style={{
                  borderColor: EY.gray,
                  color: EY.gray,
                  backgroundColor: EY.lightGray,
                }}
              >
                No hay usuarios. Agrega al menos uno para continuar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
