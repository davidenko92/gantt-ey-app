import { Task, Priority } from '@types';

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos y diacríticos
    .replace(/[^a-z]/g, ''); // Solo letras minúsculas
};

const isValidPriority = (value: string): Priority | null => {
  const normalized = normalizeString(value);
  if (normalized === 'alta') return 'Alta';
  if (normalized === 'media') return 'Media';
  if (normalized === 'baja') return 'Baja';
  return null;
};

export const parseCsvToTasks = (csvText: string): Task[] => {
  const lines = csvText.split('\n').filter((line) => line.trim());
  const extractedTasks: Task[] = [];

  lines.forEach((line, index) => {
    const columns = line.split(/[,;\t]/).map((col) => col.trim().replace(/"/g, ''));

    // Skip header
    if (index === 0 && columns[0]?.toLowerCase().includes('tarea')) return;

    if (columns.length >= 2 && columns[0] && columns[1]) {
      const taskName = columns[0].trim();
      const effort = parseInt(columns[1]) || 1;
      const priorityValue = columns[2]?.trim() || '';
      const priority: Priority = isValidPriority(priorityValue) ?? 'Media';

      if (taskName && effort > 0) {
        extractedTasks.push({
          id: `task-${extractedTasks.length + 1}`,
          name: taskName,
          effort,
          priority,
        });
      }
    }
  });

  return extractedTasks;
};
