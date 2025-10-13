import { User, UserCategory } from '@types';

interface UserJsonData {
  id?: string;
  name: string;
  category: string;
  color?: string;
  vacations?: string[];
}

const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z]/g, ''); // Only lowercase letters
};

const isValidCategory = (value: string): UserCategory | null => {
  const normalized = normalizeString(value);
  if (normalized === 'senior') return 'Senior';
  if (normalized === 'staff') return 'Staff';
  return null;
};

const DEFAULT_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange-red
];

export const parseJsonToUsers = (jsonText: string): { users: User[]; errors: string[] } => {
  const errors: string[] = [];
  const users: User[] = [];

  try {
    const data: UserJsonData[] = JSON.parse(jsonText);

    if (!Array.isArray(data)) {
      errors.push('El archivo JSON debe contener un array de usuarios');
      return { users: [], errors };
    }

    data.forEach((userData, index) => {
      const lineNumber = index + 1;

      // Validate required fields
      if (!userData.name || typeof userData.name !== 'string' || !userData.name.trim()) {
        errors.push(`Línea ${lineNumber}: El campo 'name' es obligatorio`);
        return;
      }

      if (!userData.category || typeof userData.category !== 'string') {
        errors.push(`Línea ${lineNumber}: El campo 'category' es obligatorio`);
        return;
      }

      // Validate category
      const category = isValidCategory(userData.category);
      if (!category) {
        errors.push(
          `Línea ${lineNumber}: Categoría inválida '${userData.category}'. Debe ser 'Senior' o 'Staff'`
        );
        return;
      }

      // Parse vacations
      const vacations: Date[] = [];
      if (userData.vacations && Array.isArray(userData.vacations)) {
        userData.vacations.forEach((vacationStr) => {
          const date = new Date(vacationStr);
          if (!isNaN(date.getTime())) {
            vacations.push(date);
          } else {
            errors.push(
              `Línea ${lineNumber}: Fecha de vacación inválida '${vacationStr}' para usuario '${userData.name}'`
            );
          }
        });
      }

      // Create user
      const user: User = {
        id: userData.id || `user-${Date.now()}-${index}`,
        name: userData.name.trim(),
        category,
        color: userData.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        vacations,
      };

      users.push(user);
    });

    // Check for duplicate names
    const names = users.map((u) => u.name.toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
      const uniqueDuplicates = Array.from(new Set(duplicates));
      errors.push(`Usuarios duplicados encontrados: ${uniqueDuplicates.join(', ')}`);
    }

    return { users, errors };
  } catch (error) {
    errors.push(`Error al parsear JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    return { users: [], errors };
  }
};
