import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Calendar, Users, Settings, Play } from 'lucide-react';
import { EY_COLORS, DEFAULT_USER_COLORS } from '@features/gantt/constants';
import { EYLogo } from '@components/ui/EYLogo';
import { Notification } from '@components/ui/Notification';
import { useNotification } from '@hooks/useNotification';
import { useFileUpload } from '@hooks/useFileUpload';
import { useTaskScheduler } from '@hooks/useTaskScheduler';
import { exportToExcel as exportGanttToExcel } from '@features/gantt/services/excelExporter';
import { parseJsonToUsers } from '@features/gantt/services/userJsonProcessor';
import { getDefaultTeamEffort } from '@features/gantt/services/taskExpander';
import { GanttChart } from '@features/gantt/components/GanttChart';
import { TaskTable } from '@features/gantt/components/TaskTable';
import { UserSummary } from '@features/gantt/components/UserSummary';
import { ConfigPanel } from '@features/gantt/components/ConfigPanel';
import { Task, User, Priority, Team, TaskTeamEffort } from '@types';

const App: React.FC = () => {
  const EY = EY_COLORS;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize default development team
  useEffect(() => {
    if (teams.length === 0) {
      const devTeam: Team = {
        id: 'dev',
        name: 'Desarrollo',
        color: '#3B82F6',
        users: [],
        config: {
          canWorkInParallel: false,
          triggersCorrection: false,
          correctionPriority: 'Media',
          interruptsCurrent: false,
        },
      };
      setTeams([devTeam]);
    }
  }, []);

  // Sync development team users with global users
  useEffect(() => {
    setTeams((prevTeams) =>
      prevTeams.map((team) =>
        team.id === 'dev' ? { ...team, users } : team
      )
    );
  }, [users]);

  // Notificaciones
  const { notification, notify, closeNotification } = useNotification();

  // File upload
  const { uploadedFile, handleFileUpload, clearFile } = useFileUpload({
    onTasksLoaded: (loadedTasks, fileName) => {
      if (loadedTasks.length > 0) {
        // Initialize teamEfforts for each task
        const tasksWithTeamEfforts = loadedTasks.map((task) => ({
          ...task,
          teamEfforts: teams.reduce((acc, team) => {
            if (team.id !== 'dev') {
              acc[team.id] = getDefaultTeamEffort(task, team);
            }
            return acc;
          }, {} as Record<string, TaskTeamEffort>),
        }));

        setTasks(tasksWithTeamEfforts);
        setScheduledTasks([]);
        notify(`Cargadas ${loadedTasks.length} tareas desde ${fileName}`, 'success');
      } else {
        notify('No se encontraron tareas válidas', 'error');
      }
    },
    onError: (message) => {
      notify(message, 'error');
    },
  });

  // Task scheduler
  const { scheduleTasks } = useTaskScheduler({
    onScheduled: (scheduled) => {
      setScheduledTasks(scheduled);
      notify(`Planificadas ${scheduled.length} tareas`, 'success');
    },
    onError: (message) => {
      notify(message, 'error');
    },
    onWarning: (message) => {
      notify(message, 'info');
    },
  });

  // Gestión de usuarios
  const addUser = () => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: `Usuario ${users.length + 1}`,
      category: 'Senior', // Default category
      color: DEFAULT_USER_COLORS[users.length % DEFAULT_USER_COLORS.length],
      vacations: [],
    };
    setUsers([...users, newUser]);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, ...updates } : u)));
  };

  const removeUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId));
  };

  const handleLoadUsersJson = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { users: loadedUsers, errors } = parseJsonToUsers(text);

      if (errors.length > 0) {
        notify(`Errores al cargar usuarios:\n${errors.join('\n')}`, 'error');
        return;
      }

      if (loadedUsers.length === 0) {
        notify('No se encontraron usuarios válidos en el JSON', 'error');
        return;
      }

      setUsers(loadedUsers);
      notify(`Cargados ${loadedUsers.length} usuarios desde ${file.name}`, 'success');
    } catch (error) {
      notify('Error al leer el archivo JSON', 'error');
    }

    // Reset input for same file reload
    event.target.value = '';
  };

  // Gestión de equipos
  const addTeam = () => {
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      name: `Equipo ${teams.length}`,
      color: '#8B5CF6',
      users: [],
      config: {
        canWorkInParallel: true,
        triggersCorrection: true,
        correctionTeam: 'dev',
        correctionPriority: 'Alta',
        interruptsCurrent: false,
        defaultReviewEffortPercent: 100,
        defaultCorrectionDays: 1,
      },
    };
    setTeams([...teams, newTeam]);

    // Initialize teamEfforts for existing tasks
    setTasks((prevTasks) =>
      prevTasks.map((task) => ({
        ...task,
        teamEfforts: {
          ...task.teamEfforts,
          [newTeam.id]: getDefaultTeamEffort(task, newTeam),
        },
      }))
    );
  };

  const updateTeam = (teamId: string, updates: Partial<Team>) => {
    setTeams(teams.map((t) => (t.id === teamId ? { ...t, ...updates } : t)));
  };

  const removeTeam = (teamId: string) => {
    if (teamId === 'dev') {
      notify('No se puede eliminar el equipo de desarrollo', 'error');
      return;
    }

    setTeams(teams.filter((t) => t.id !== teamId));

    // Remove teamEfforts for this team from all tasks
    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        const { [teamId]: removed, ...remainingEfforts } = task.teamEfforts;
        return {
          ...task,
          teamEfforts: remainingEfforts,
        };
      })
    );
  };

  // Gestión de prioridades de tareas
  const updateTaskPriority = (taskId: string, newPriority: Priority) => {
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, priority: newPriority } : t)));
    // Limpiar tareas planificadas para que se replanifiquen con la nueva prioridad
    setScheduledTasks([]);
  };

  // Gestión de teamEfforts de tareas
  const updateTaskTeamEffort = (
    taskId: string,
    teamId: string,
    effortUpdates: Partial<TaskTeamEffort>
  ) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              teamEfforts: {
                ...task.teamEfforts,
                [teamId]: {
                  ...task.teamEfforts[teamId],
                  ...effortUpdates,
                },
              },
            }
          : task
      )
    );
    // Clear scheduled tasks so they get re-planned
    setScheduledTasks([]);
  };

  // Planificación automática
  const scheduleTasksAutomatically = () => {
    scheduleTasks(tasks, users, teams, startDate);
  };

  // Exportar
  const exportToExcel = () => {
    if (!scheduledTasks.length) {
      notify('No hay tareas para exportar', 'error');
      return;
    }

    try {
      const fileName = exportGanttToExcel({ scheduledTasks, users });
      notify(`Archivo Excel descargado: ${fileName}`, 'success');
    } catch (error) {
      notify('Error al exportar a Excel', 'error');
    }
  };

  return (
    <div
      className="min-h-screen p-4"
      style={{ background: `linear-gradient(135deg, ${EY.lightGray} 0%, ${EY.white} 100%)` }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Notificaciones */}
        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={closeNotification}
          />
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-6 mb-4">
            <EYLogo size={100} />
            <div className="h-16 w-px" style={{ backgroundColor: EY.gray }}></div>
            <div className="text-left">
              <h1 className="text-4xl font-bold" style={{ color: EY.black }}>
                Planificador de Proyectos
              </h1>
              <p className="text-lg mt-1" style={{ color: EY.gray }}>
                Gestiona tus proyectos de forma visual
              </p>
            </div>
          </div>
        </div>

        {/* Panel de control */}
        <div
          className="bg-white rounded-lg shadow-lg p-6 mb-6"
          style={{ borderTop: `6px solid ${EY.yellow}` }}
        >
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4">
              {!uploadedFile ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-white px-6 py-3 rounded-lg hover:opacity-90 font-medium shadow-md"
                  style={{ backgroundColor: EY.black }}
                >
                  <Upload size={20} />
                  Cargar Archivo
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 shadow-sm"
                    style={{ backgroundColor: EY.lightGray, borderColor: EY.yellow }}
                  >
                    <Calendar size={16} />
                    <span className="text-sm font-medium">{uploadedFile.name}</span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 text-white rounded-md hover:opacity-90 text-sm shadow-md"
                    style={{ backgroundColor: EY.black }}
                  >
                    Reemplazar
                  </button>
                  <button
                    onClick={() => {
                      clearFile();
                      setTasks([]);
                      setScheduledTasks([]);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              )}

              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 text-white px-6 py-3 rounded-lg hover:opacity-90 font-medium shadow-md"
                style={{ backgroundColor: EY.gray }}
              >
                <Settings size={20} />
                Configuración
              </button>

              <button
                onClick={scheduleTasksAutomatically}
                disabled={!tasks.length || !users.length}
                className="flex items-center gap-2 px-6 py-3 rounded-lg hover:opacity-90 font-medium shadow-md disabled:bg-gray-400"
                style={{
                  backgroundColor: !tasks.length || !users.length ? '#9CA3AF' : EY.yellow,
                  color: EY.black,
                }}
              >
                <Play size={20} />
                Planificar
              </button>
            </div>

            <button
              onClick={exportToExcel}
              disabled={!scheduledTasks.length}
              className="flex items-center gap-2 px-6 py-3 rounded-lg hover:opacity-90 font-medium shadow-md disabled:bg-gray-400"
              style={{
                backgroundColor: !scheduledTasks.length ? '#9CA3AF' : EY.yellow,
                color: !scheduledTasks.length ? EY.white : EY.black,
              }}
            >
              <Download size={20} />
              Descargar Excel
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Panel de configuración */}
        {showConfig && (
          <ConfigPanel
            startDate={startDate}
            users={users}
            teams={teams}
            onStartDateChange={setStartDate}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onRemoveUser={removeUser}
            onLoadUsersJson={handleLoadUsersJson}
            onAddTeam={addTeam}
            onUpdateTeam={updateTeam}
            onRemoveTeam={removeTeam}
            onNotify={notify}
          />
        )}

        {/* Resumen de tareas */}
        <TaskTable
          tasks={tasks}
          scheduledTasks={scheduledTasks}
          users={users}
          teams={teams}
          onUpdatePriority={updateTaskPriority}
          onUpdateTaskTeamEffort={updateTaskTeamEffort}
        />

        {/* Resumen por usuario */}
        <UserSummary scheduledTasks={scheduledTasks} users={users} teams={teams} />

        {/* Diagrama de Gantt */}
        <GanttChart scheduledTasks={scheduledTasks} users={users} teams={teams} />

        {/* Mensaje inicial */}
        {!uploadedFile && !tasks.length && (
          <div className="text-center py-12">
            <Calendar size={64} className="mx-auto mb-4" style={{ color: EY.gray }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: EY.black }}>
              No hay archivo cargado
            </h3>
            <p className="mb-4" style={{ color: EY.gray }}>
              Sube tu archivo Excel (.xlsx, .xls) o CSV (.csv) para comenzar
            </p>
            <div
              className="rounded-lg p-4 max-w-md mx-auto mb-4"
              style={{ backgroundColor: EY.lightGray }}
            >
              <p className="text-sm" style={{ color: EY.black }}>
                <strong>Formato esperado:</strong>
                <br />
                <strong>Columna A:</strong> Nombre de la tarea
                <br />
                <strong>Columna B:</strong> Esfuerzo en días
              </p>
            </div>
          </div>
        )}

        {/* Advertencia usuarios */}
        {tasks.length > 0 && !users.length && (
          <div
            className="border-2 rounded-lg p-4 mb-6"
            style={{ borderColor: EY.yellow, backgroundColor: '#FEF3C7' }}
          >
            <div className="flex items-center gap-2">
              <Users size={20} style={{ color: EY.black }} />
              <p style={{ color: EY.black }}>
                <strong>¡Atención!</strong> Agrega usuarios en la configuración para planificar las
                tareas.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
