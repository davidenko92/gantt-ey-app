import React, { useRef, useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Users, Settings, Upload, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { EY_COLORS } from '@features/gantt/constants';
import { User, UserCategory, Team, Priority } from '@types';
import { MultiSelect } from '@components/ui/MultiSelect';

interface ConfigPanelProps {
  startDate: Date;
  users: User[];
  teams: Team[];
  onStartDateChange: (date: Date) => void;
  onAddUser: () => void;
  onUpdateUser: (userId: string, updates: Partial<User>) => void;
  onRemoveUser: (userId: string) => void;
  onLoadUsersJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onAddTeam: () => void;
  onUpdateTeam: (teamId: string, updates: Partial<Team>) => void;
  onRemoveTeam: (teamId: string) => void;
  onNotify: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  startDate,
  users,
  teams,
  onStartDateChange,
  onAddUser,
  onUpdateUser,
  onRemoveUser,
  onLoadUsersJson,
  onAddTeam,
  onUpdateTeam,
  onRemoveTeam,
  onNotify,
}) => {
  const EY = EY_COLORS;
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeamExpansion = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

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

          <div className="flex gap-4 mb-6">
            <button
              onClick={onAddUser}
              className="flex items-center gap-2 text-white px-6 py-3 rounded-lg hover:opacity-90 shadow-md font-medium"
              style={{ backgroundColor: EY.black }}
            >
              <Plus size={18} />
              Agregar Usuario
            </button>
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 rounded-lg hover:opacity-90 shadow-md font-medium"
              style={{ backgroundColor: EY.yellow, color: EY.black }}
            >
              <Upload size={18} />
              Cargar Usuarios JSON
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json"
              onChange={onLoadUsersJson}
              className="hidden"
            />
          </div>

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
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={user.name}
                      onChange={(e) => onUpdateUser(user.id, { name: e.target.value })}
                      className="w-full border-2 rounded-lg px-4 py-3 font-medium focus:outline-none"
                      style={{ borderColor: EY.gray }}
                      placeholder="Nombre del usuario"
                    />
                    <select
                      value={user.category}
                      onChange={(e) =>
                        onUpdateUser(user.id, { category: e.target.value as UserCategory })
                      }
                      className="w-full border-2 rounded-lg px-4 py-3 font-medium focus:outline-none cursor-pointer"
                      style={{ borderColor: EY.gray }}
                    >
                      <option value="Senior">Senior (x1.0)</option>
                      <option value="Staff">Staff (x1.4)</option>
                    </select>
                  </div>
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

        {/* Equipos */}
        <div>
          <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: EY.black }}>
            <Shield size={18} />
            Gestión de Equipos
          </h4>

          <div className="flex gap-4 mb-6">
            <button
              onClick={onAddTeam}
              className="flex items-center gap-2 text-white px-6 py-3 rounded-lg hover:opacity-90 shadow-md font-medium"
              style={{ backgroundColor: EY.black }}
            >
              <Plus size={18} />
              Agregar Equipo
            </button>
          </div>

          <div className="space-y-6">
            {teams.filter((t) => t.id !== 'dev').map((team) => {
              const isExpanded = expandedTeams.has(team.id);
              const availableUsers = users.filter((u) =>
                team.users.some((tu) => tu.id === u.id)
              );

              return (
                <div
                  key={team.id}
                  className="border-2 rounded-xl shadow-sm"
                  style={{ borderColor: EY.yellow, backgroundColor: EY.lightGray }}
                >
                  {/* Header colapsable */}
                  <div
                    className="flex items-center justify-between p-6 cursor-pointer hover:bg-yellow-50"
                    onClick={() => toggleTeamExpansion(team.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: team.color + '20', color: team.color }}
                      >
                        <Shield size={24} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-lg" style={{ color: EY.black }}>
                          {team.name}
                        </h5>
                        <p className="text-sm" style={{ color: EY.gray }}>
                          {availableUsers.length} usuarios asignados
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveTeam(team.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={20} />
                      </button>
                      {isExpanded ? (
                        <ChevronUp size={24} style={{ color: EY.gray }} />
                      ) : (
                        <ChevronDown size={24} style={{ color: EY.gray }} />
                      )}
                    </div>
                  </div>

                  {/* Contenido expandible */}
                  {isExpanded && (
                    <div className="px-6 pb-6 space-y-6">
                      {/* Información básica */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                            Nombre del Equipo
                          </label>
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => onUpdateTeam(team.id, { name: e.target.value })}
                            className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none"
                            style={{ borderColor: EY.gray }}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                            Color
                          </label>
                          <input
                            type="color"
                            value={team.color}
                            onChange={(e) => onUpdateTeam(team.id, { color: e.target.value })}
                            className="w-full h-10 rounded-lg border-2 cursor-pointer"
                            style={{ borderColor: EY.gray }}
                          />
                        </div>
                      </div>

                      {/* Usuarios del equipo */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                          Usuarios del Equipo
                        </label>
                        <MultiSelect
                          options={users}
                          selected={team.users.map((u) => u.name)}
                          onChange={(selectedNames) => {
                            const selectedUsers = users.filter((u) =>
                              selectedNames.includes(u.name)
                            );
                            onUpdateTeam(team.id, { users: selectedUsers });
                          }}
                          placeholder="Seleccionar usuarios..."
                        />
                      </div>

                      {/* Dependencias */}
                      <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                          Depende de Equipo
                        </label>
                        <select
                          value={team.config.dependsOn || ''}
                          onChange={(e) =>
                            onUpdateTeam(team.id, {
                              config: { ...team.config, dependsOn: e.target.value || undefined },
                            })
                          }
                          className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none cursor-pointer"
                          style={{ borderColor: EY.gray }}
                        >
                          <option value="">Ninguno</option>
                          {teams
                            .filter((t) => t.id !== team.id)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      {/* Configuración de comportamiento */}
                      <div className="space-y-4">
                        <h6 className="font-semibold text-sm" style={{ color: EY.black }}>
                          Configuración de Comportamiento
                        </h6>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={team.config.canWorkInParallel}
                            onChange={(e) =>
                              onUpdateTeam(team.id, {
                                config: { ...team.config, canWorkInParallel: e.target.checked },
                              })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">Puede trabajar en paralelo</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={team.config.triggersCorrection}
                            onChange={(e) =>
                              onUpdateTeam(team.id, {
                                config: { ...team.config, triggersCorrection: e.target.checked },
                              })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm">Genera tareas de corrección</span>
                        </label>

                        {team.config.triggersCorrection && (
                          <>
                            <div className="ml-8 space-y-4">
                              <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                                  Equipo de Corrección
                                </label>
                                <select
                                  value={team.config.correctionTeam || 'dev'}
                                  onChange={(e) =>
                                    onUpdateTeam(team.id, {
                                      config: { ...team.config, correctionTeam: e.target.value },
                                    })
                                  }
                                  className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none cursor-pointer"
                                  style={{ borderColor: EY.gray }}
                                >
                                  {teams.map((t) => (
                                    <option key={t.id} value={t.id}>
                                      {t.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                                  Prioridad de Corrección
                                </label>
                                <select
                                  value={team.config.correctionPriority}
                                  onChange={(e) =>
                                    onUpdateTeam(team.id, {
                                      config: {
                                        ...team.config,
                                        correctionPriority: e.target.value as Priority,
                                      },
                                    })
                                  }
                                  className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none cursor-pointer"
                                  style={{ borderColor: EY.gray }}
                                >
                                  <option value="Alta">Alta</option>
                                  <option value="Media">Media</option>
                                  <option value="Baja">Baja</option>
                                </select>
                              </div>

                              <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={team.config.interruptsCurrent}
                                  onChange={(e) =>
                                    onUpdateTeam(team.id, {
                                      config: { ...team.config, interruptsCurrent: e.target.checked },
                                    })
                                  }
                                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                                />
                                <span className="text-sm">Interrumpe tareas actuales</span>
                              </label>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Valores por defecto */}
                      <div className="space-y-4">
                        <h6 className="font-semibold text-sm" style={{ color: EY.black }}>
                          Valores por Defecto
                        </h6>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                              Esfuerzo Revisión (% del desarrollo)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="200"
                              value={team.config.defaultReviewEffortPercent || 100}
                              onChange={(e) =>
                                onUpdateTeam(team.id, {
                                  config: {
                                    ...team.config,
                                    defaultReviewEffortPercent: parseInt(e.target.value) || 100,
                                  },
                                })
                              }
                              className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none"
                              style={{ borderColor: EY.gray }}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: EY.black }}>
                              Días de Corrección
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={team.config.defaultCorrectionDays || 1}
                              onChange={(e) =>
                                onUpdateTeam(team.id, {
                                  config: {
                                    ...team.config,
                                    defaultCorrectionDays: parseFloat(e.target.value) || 1,
                                  },
                                })
                              }
                              className="w-full border-2 rounded-lg px-4 py-2 focus:outline-none"
                              style={{ borderColor: EY.gray }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {teams.filter((t) => t.id !== 'dev').length === 0 && (
              <div
                className="text-center py-12 border-2 border-dashed rounded-lg"
                style={{
                  borderColor: EY.gray,
                  color: EY.gray,
                  backgroundColor: EY.lightGray,
                }}
              >
                No hay equipos adicionales. El equipo de desarrollo se configura automáticamente.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
