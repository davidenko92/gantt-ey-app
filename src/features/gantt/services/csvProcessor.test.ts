import { parseCsvToTasks } from './csvProcessor';

describe('csvProcessor', () => {
  describe('parseCsvToTasks', () => {
    it('debe parsear CSV válido con header', () => {
      const csvText = `Tarea,Esfuerzo,Prioridad,Persona asignada
Diseño UI,3,Alta,Juan
Desarrollo Backend,5,Media,
Testing,2,Baja,María;Pedro`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'task-1',
        name: 'Diseño UI',
        effortBase: 3,
        priority: 'Alta',
        assignedUsers: ['Juan'],
      });
      expect(result[1]).toEqual({
        id: 'task-2',
        name: 'Desarrollo Backend',
        effortBase: 5,
        priority: 'Media',
        assignedUsers: [],
      });
      expect(result[2]).toEqual({
        id: 'task-3',
        name: 'Testing',
        effortBase: 2,
        priority: 'Baja',
        assignedUsers: ['María', 'Pedro'],
      });
    });

    it('debe parsear CSV sin header', () => {
      const csvText = `Implementación API,4
Code Review,1`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Implementación API');
      expect(result[0].effortBase).toBe(4);
      expect(result[1].name).toBe('Code Review');
      expect(result[1].effortBase).toBe(1);
    });

    it('debe manejar delimitador de punto y coma', () => {
      const csvText = `Análisis;3
Diseño;2`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Análisis');
      expect(result[0].effortBase).toBe(3);
    });

    it('debe manejar delimitador de tabulación', () => {
      const csvText = `Tarea\tEsfuerzo
Implementación\t5
Testing\t3`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Implementación');
      expect(result[0].effortBase).toBe(5);
    });

    it('debe remover comillas de los valores', () => {
      // Primera línea con "tarea" será ignorada como header
      const csvText = `"tareas","esfuerzo"
"Desarrollo API","7"
"Testing","4"`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Desarrollo API');
      expect(result[0].effortBase).toBe(7);
    });

    it('debe ignorar líneas vacías', () => {
      const csvText = `Desarrollo,2

Implementación,3

`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
    });

    it('debe usar esfuerzo 1 por defecto si el valor es inválido', () => {
      const csvText = `Código sin esfuerzo,abc
Código válido,5`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].effortBase).toBe(1);
      expect(result[1].effortBase).toBe(5);
    });

    it('debe convertir esfuerzo 0 a 1 e ignorar negativos', () => {
      // parseInt('0') || 1 resulta en 1
      // parseInt('-5') resulta en -5, que se filtra por effortBase > 0
      const csvText = `Desarrollo válido,3
Diseño con 0,0
Implementación negativa,-5
Otro válido,2`;

      const result = parseCsvToTasks(csvText);

      // "Diseño con 0" se convierte en effortBase: 1, así que se incluye
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Desarrollo válido');
      expect(result[0].effortBase).toBe(3);
      expect(result[1].name).toBe('Diseño con 0');
      expect(result[1].effortBase).toBe(1); // 0 se convierte en 1
      expect(result[2].name).toBe('Otro válido');
      expect(result[2].effortBase).toBe(2);
    });

    it('debe ignorar líneas con menos de 2 columnas', () => {
      const csvText = `Desarrollo válido,3
Solo una columna
,5
Implementación válida,2`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Desarrollo válido');
      expect(result[1].name).toBe('Implementación válida');
    });

    it('debe retornar array vacío para CSV vacío', () => {
      const result = parseCsvToTasks('');

      expect(result).toEqual([]);
    });

    it('debe retornar array vacío para CSV solo con espacios', () => {
      const result = parseCsvToTasks('   \n  \n   ');

      expect(result).toEqual([]);
    });

    it('debe generar IDs secuenciales', () => {
      // Evitar "tarea" en nombres para que no se detecte como header
      const csvText = `Desarrollo A,1
Desarrollo B,2
Desarrollo C,3`;

      const result = parseCsvToTasks(csvText);

      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
      expect(result[2].id).toBe('task-3');
    });

    it('debe ignorar header case-insensitive', () => {
      const csvText = `TAREA,Esfuerzo
Implementación,5`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Implementación');
    });

    it('debe detectar header con variaciones', () => {
      const csvText = `tareas principales,días
Desarrollo,3`;

      const result = parseCsvToTasks(csvText);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Desarrollo');
    });
  });
});
