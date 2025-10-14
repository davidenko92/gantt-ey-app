import { User } from '@types';

export const dateUtils = {
  isWeekend: (date: Date) => [0, 6].includes(date.getDay()),

  isHoliday: (date: Date, holidays: Date[]) =>
    holidays.some((h) => h.toDateString() === date.toDateString()),

  isUserOnVacation: (date: Date, user: User) =>
    user.vacations.some((v) => v.toDateString() === date.toDateString()),

  /**
   * Gets the next working day after the given date
   * Skips weekends, holidays, and optionally user vacations
   */
  getNextWorkingDay: (date: Date, user?: User, holidays: Date[] = []) => {
    let nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (
      dateUtils.isWeekend(nextDay) ||
      dateUtils.isHoliday(nextDay, holidays) ||
      (user && dateUtils.isUserOnVacation(nextDay, user))
    ) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  },

  addWorkingDays: (startDate: Date, days: number, user: User, holidays: Date[] = []) => {
    let current = new Date(startDate);
    let remaining = days;

    while (remaining > 0) {
      if (
        !dateUtils.isWeekend(current) &&
        !dateUtils.isHoliday(current, holidays) &&
        !dateUtils.isUserOnVacation(current, user)
      ) {
        remaining--;
      }
      if (remaining > 0) current.setDate(current.getDate() + 1);
    }
    return current;
  },
};
