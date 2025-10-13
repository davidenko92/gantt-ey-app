import { dateUtils } from './dateUtils';
import { User } from '../../../types';

describe('dateUtils', () => {
  describe('isWeekend', () => {
    it('debe identificar sábado como fin de semana', () => {
      const saturday = new Date('2025-01-11'); // Sábado
      expect(dateUtils.isWeekend(saturday)).toBe(true);
    });

    it('debe identificar domingo como fin de semana', () => {
      const sunday = new Date('2025-01-12'); // Domingo
      expect(dateUtils.isWeekend(sunday)).toBe(true);
    });

    it('debe identificar lunes como día laboral', () => {
      const monday = new Date('2025-01-13'); // Lunes
      expect(dateUtils.isWeekend(monday)).toBe(false);
    });

    it('debe identificar viernes como día laboral', () => {
      const friday = new Date('2025-01-10'); // Viernes
      expect(dateUtils.isWeekend(friday)).toBe(false);
    });
  });

  describe('isHoliday', () => {
    const holidays = [new Date('2025-12-25'), new Date('2025-01-01')];

    it('debe identificar fecha como festivo', () => {
      const christmas = new Date('2025-12-25');
      expect(dateUtils.isHoliday(christmas, holidays)).toBe(true);
    });

    it('debe retornar false para fecha no festiva', () => {
      const regularDay = new Date('2025-06-15');
      expect(dateUtils.isHoliday(regularDay, holidays)).toBe(false);
    });

    it('debe retornar false cuando no hay festivos', () => {
      const anyDay = new Date('2025-03-10');
      expect(dateUtils.isHoliday(anyDay, [])).toBe(false);
    });
  });

  describe('isUserOnVacation', () => {
    const user: User = {
      id: 'user-1',
      name: 'Test User',
      category: 'Senior',
      color: '#000',
      vacations: [new Date('2025-08-01'), new Date('2025-08-02')],
    };

    it('debe identificar día de vacaciones del usuario', () => {
      const vacationDay = new Date('2025-08-01');
      expect(dateUtils.isUserOnVacation(vacationDay, user)).toBe(true);
    });

    it('debe retornar false para día sin vacaciones', () => {
      const workDay = new Date('2025-07-15');
      expect(dateUtils.isUserOnVacation(workDay, user)).toBe(false);
    });

    it('debe retornar false cuando usuario no tiene vacaciones', () => {
      const userNoVacations: User = { ...user, vacations: [] };
      const anyDay = new Date('2025-08-01');
      expect(dateUtils.isUserOnVacation(anyDay, userNoVacations)).toBe(false);
    });
  });

  describe('addWorkingDays', () => {
    const user: User = {
      id: 'user-1',
      name: 'Test User',
      category: 'Senior',
      color: '#000',
      vacations: [new Date('2025-01-15')],
    };

    it('debe agregar días laborales saltando fines de semana', () => {
      const friday = new Date('2025-01-10');
      const result = dateUtils.addWorkingDays(friday, 1, user);
      // Viernes 10 (día 1) → resultado = viernes 10
      expect(result.getDate()).toBe(10);
      expect(result.getMonth()).toBe(0);
    });

    it('debe saltar vacaciones del usuario', () => {
      const tuesday = new Date('2025-01-14');
      const result = dateUtils.addWorkingDays(tuesday, 1, user);
      // Martes 14 (día 1) → resultado = martes 14
      expect(result.getDate()).toBe(14);
    });

    it('debe saltar festivos especificados', () => {
      const userNoVacations: User = { ...user, vacations: [] };
      const holidays = [new Date('2025-01-13')];
      const friday = new Date('2025-01-10');
      const result = dateUtils.addWorkingDays(friday, 1, userNoVacations, holidays);
      // Viernes 10 (día 1) → resultado = viernes 10
      expect(result.getDate()).toBe(10);
    });

    it('debe manejar múltiples días laborales', () => {
      const monday = new Date('2025-01-06');
      const userClean: User = { ...user, vacations: [] };
      const result = dateUtils.addWorkingDays(monday, 5, userClean);
      // Lun 6 (día 1), Mar 7 (día 2), Mié 8 (día 3), Jue 9 (día 4), Vie 10 (día 5)
      expect(result.getDate()).toBe(10);
    });

    it('debe retornar la misma fecha para 0 días', () => {
      const today = new Date('2025-01-14');
      const result = dateUtils.addWorkingDays(today, 0, user);
      expect(result.toDateString()).toBe(today.toDateString());
    });

    it('debe saltar combinación de fin de semana, festivos y vacaciones', () => {
      const userMultiVacations: User = {
        ...user,
        vacations: [new Date('2025-01-13'), new Date('2025-01-14')],
      };
      const friday = new Date('2025-01-10');
      const result = dateUtils.addWorkingDays(friday, 1, userMultiVacations);
      // Viernes 10 es día laboral (no está en vacaciones), cuenta como día 1
      expect(result.getDate()).toBe(10);
    });
  });
});
