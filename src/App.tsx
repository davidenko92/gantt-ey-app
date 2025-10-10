import React, { useState, useRef } from 'react';
import { Upload, Download, Calendar, Users, Settings, Play } from 'lucide-react';
import { EY_COLORS, DEFAULT_USER_COLORS } from '@features/gantt/constants';
import { EYLogo } from '@components/ui/EYLogo';
import { Notification } from '@components/ui/Notification';
import { useNotification } from '@hooks/useNotification';
import { useFileUpload } from '@hooks/useFileUpload';
import { useTaskScheduler } from '@hooks/useTaskScheduler';
import { exportToExcel as exportGanttToExcel } from '@features/gantt/services/excelExporter';
import { GanttChart } from '@features/gantt/components/GanttChart';
import { TaskTable } from '@features/gantt/components/TaskTable';
import { UserSummary } from '@features/gantt/components/UserSummary';
import { ConfigPanel } from '@features/gantt/components/ConfigPanel';
import { Task, User } from '@types';

const App: React.FC = () => {
  const EY = EY_COLORS;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<Task[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [showConfig, setShowConfig] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notificaciones
  const { notification, notify, closeNotification } = useNotification();

  // File upload
  const { uploadedFile, handleFileUpload, clearFile } = useFileUpload({
    onTasksLoaded: (loadedTasks, fileName) => {
      if (loadedTasks.length > 0) {
        setTasks(loadedTasks);
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
  });

  // Gestión de usuarios
  const addUser = () => {
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: `Usuario ${users.length + 1}`,
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

  // Planificación automática
  const scheduleTasksAutomatically = () => {
    scheduleTasks(tasks, users, startDate);
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
            onStartDateChange={setStartDate}
            onAddUser={addUser}
            onUpdateUser={updateUser}
            onRemoveUser={removeUser}
            onNotify={notify}
          />
        )}

        {/* Resumen de tareas */}
        <TaskTable tasks={tasks} scheduledTasks={scheduledTasks} users={users} />

        {/* Resumen por usuario */}
        <UserSummary scheduledTasks={scheduledTasks} users={users} />

        {/* Diagrama de Gantt */}
        <GanttChart scheduledTasks={scheduledTasks} users={users} />

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
