import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { parseCsvToTasks } from '../features/gantt/services/csvProcessor';
import { Task } from '../types';

interface UseFileUploadOptions {
  onTasksLoaded: (tasks: Task[], fileName: string) => void;
  onError: (message: string) => void;
}

export const useFileUpload = ({ onTasksLoaded, onError }: UseFileUploadOptions) => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileName = file.name.toLowerCase();
      const isCSV = fileName.endsWith('.csv');
      const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (!isCSV && !isExcel) {
        onError('Solo archivos CSV o Excel');
        return;
      }

      setUploadedFile(file);

      try {
        if (isCSV) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const csvText = e.target?.result as string;
            const tasks = parseCsvToTasks(csvText);
            onTasksLoaded(tasks, file.name);
          };
          reader.readAsText(file);
        } else {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const workbook = XLSX.read(e.target?.result, { type: 'array' });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const csvData = XLSX.utils.sheet_to_csv(worksheet);
              const tasks = parseCsvToTasks(csvData);
              onTasksLoaded(tasks, file.name);
            } catch {
              onError('Error procesando Excel');
            }
          };
          reader.readAsArrayBuffer(file);
        }
      } catch {
        onError('Error al leer archivo');
      }
    },
    [onTasksLoaded, onError]
  );

  const clearFile = useCallback(() => {
    setUploadedFile(null);
  }, []);

  return {
    uploadedFile,
    handleFileUpload,
    clearFile,
  };
};
