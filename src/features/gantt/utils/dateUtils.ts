import { User } from '@types';

export const dateUtils = {
  isWeekend: (date: Date) => [0, 6].includes(date.getDay()),

  isHoliday: (date: Date, holidays: Date[]) =>
    holidays.some((h) => h.toDateString() === date.toDateString()),

  isUserOnVacation: (date: Date, user: User) =>
    user.vacations.some((v) => v.toDateString() === date.toDateString()),

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
