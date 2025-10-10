import * as XLSX from 'xlsx';
import { Task, User } from '@types';

export interface ExportOptions {
  scheduledTasks: Task[];
  users: User[];
}

export const exportToExcel = (options: ExportOptions): string => {
  const { scheduledTasks, users } = options;

  const wb = XLSX.utils.book_new();

  // Calcular rango de fechas
  const dates = scheduledTasks.reduce((acc: Date[], task) => {
    if (task.startDate) acc.push(task.startDate);
    if (task.endDate) acc.push(task.endDate);
    return acc;
  }, [] as Date[]);

  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
  const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Crear matriz del Gantt
  const ganttMatrix = [];

  // Header row con fechas
  const headerRow = ['Tarea', 'Usuario', 'Inicio', 'Fin', 'Días'];
  for (let i = 0; i < totalDays; i++) {
    const date = new Date(minDate);
    date.setDate(date.getDate() + i);
    headerRow.push(date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
  }
  ganttMatrix.push(headerRow);

  // Filas de tareas
  scheduledTasks.forEach((task) => {
    if (!task.startDate || !task.endDate) return;

    const startOffset = Math.floor(
      (task.startDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration =
      Math.floor((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const row = [
      task.name,
      task.assignedUser || '',
      task.startDate.toLocaleDateString('es-ES'),
      task.endDate.toLocaleDateString('es-ES'),
      task.effort,
    ];

    // Llenar días del proyecto
    for (let i = 0; i < totalDays; i++) {
      if (i >= startOffset && i < startOffset + duration) {
        // Usar caracteres para representar la barra
        row.push('███');
      } else {
        row.push('');
      }
    }
    ganttMatrix.push(row);
  });

  // Crear worksheet
  const ws = XLSX.utils.aoa_to_sheet(ganttMatrix);

  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 30 }, // Tarea
    { wch: 15 }, // Usuario
    { wch: 12 }, // Inicio
    { wch: 12 }, // Fin
    { wch: 8 }, // Días
  ];

  // Añadir ancho para columnas de fechas
  for (let i = 0; i < totalDays; i++) {
    colWidths.push({ wch: 4 });
  }

  ws['!cols'] = colWidths;

  // Añadir al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Diagrama Gantt');

  // Crear hoja de resumen
  const summaryData: any[][] = [
    ['RESUMEN DEL PROYECTO'],
    [''],
    ['Fecha generación:', new Date().toLocaleDateString('es-ES')],
    ['Total tareas:', scheduledTasks.length],
    ['Fecha inicio proyecto:', minDate.toLocaleDateString('es-ES')],
    ['Fecha fin proyecto:', maxDate.toLocaleDateString('es-ES')],
    [''],
    ['RESUMEN POR USUARIO'],
    ['Usuario', 'Tareas', 'Días totales'],
  ];

  users.forEach((user) => {
    const userTasks = scheduledTasks.filter((t) => t.assignedUser === user.name);
    const totalUserDays = userTasks.reduce((sum, t) => sum + t.effort, 0);
    summaryData.push([user.name, userTasks.length, totalUserDays]);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 20 }, { wch: 10 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // Generar nombre de archivo y descargar
  const fileName = `Gantt_EY_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return fileName;
};
