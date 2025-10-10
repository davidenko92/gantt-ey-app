import { Task } from '@types';

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

      if (taskName && effort > 0) {
        extractedTasks.push({
          id: `task-${extractedTasks.length + 1}`,
          name: taskName,
          effort,
        });
      }
    }
  });

  return extractedTasks;
};
