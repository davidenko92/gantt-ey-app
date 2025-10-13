import { User, UserCategory, EFFORT_MULTIPLIERS } from '@types';

/**
 * Divides the base effort among multiple users
 * First user gets Math.ceil(effort / numUsers), remainder distributed to others
 *
 * Example: 5 days, 2 users -> User1: 3 days, User2: 2 days
 * Example: 6 days, 2 users -> User1: 3 days, User2: 3 days
 */
export const divideEffortAmongUsers = (effortBase: number, numUsers: number): number[] => {
  if (numUsers <= 0) return [];
  if (numUsers === 1) return [effortBase];

  const efforts: number[] = [];
  const baseEffortPerUser = Math.ceil(effortBase / numUsers);

  // First user gets the ceiling division
  efforts.push(baseEffortPerUser);

  let remainingEffort = effortBase - baseEffortPerUser;
  const remainingUsers = numUsers - 1;

  // Distribute remaining effort among other users
  for (let i = 0; i < remainingUsers; i++) {
    const effortForThisUser = Math.ceil(remainingEffort / (remainingUsers - i));
    efforts.push(effortForThisUser);
    remainingEffort -= effortForThisUser;
  }

  return efforts;
};

/**
 * Applies the category multiplier to an effort value
 * Always rounds UP using Math.ceil()
 *
 * Example: Staff, 5 days -> 5 * 1.4 = 7.0 -> 7 days
 * Example: Staff, 3 days -> 3 * 1.4 = 4.2 -> 5 days
 * Example: Senior, 5 days -> 5 * 1.0 = 5.0 -> 5 days
 */
export const applyMultiplier = (effort: number, category: UserCategory): number => {
  const multiplier = EFFORT_MULTIPLIERS[category];
  const result = effort * multiplier;
  return Math.ceil(result);
};

/**
 * Calculates the final effort for each user assigned to a task
 * 1. Divides base effort among users
 * 2. Applies category multiplier to each user's portion
 * 3. Rounds up each result
 */
export const calculateEffortByUser = (
  effortBase: number,
  assignedUsers: string[],
  users: User[]
): Record<string, number> => {
  const effortByUser: Record<string, number> = {};

  if (assignedUsers.length === 0) {
    return effortByUser;
  }

  // Divide base effort
  const dividedEfforts = divideEffortAmongUsers(effortBase, assignedUsers.length);

  // Apply multiplier for each user
  assignedUsers.forEach((userName, index) => {
    const user = users.find((u) => u.name === userName);
    if (!user) {
      // If user not found, use base effort without multiplier
      effortByUser[userName] = dividedEfforts[index];
      return;
    }

    const baseEffort = dividedEfforts[index];
    const finalEffort = applyMultiplier(baseEffort, user.category);
    effortByUser[userName] = finalEffort;
  });

  return effortByUser;
};

/**
 * Gets the total effort for a specific user across all their assigned tasks
 */
export const getTotalEffortForUser = (
  userName: string,
  tasks: Array<{ assignedUsers: string[]; effortByUser?: Record<string, number> }>
): number => {
  return tasks.reduce((total, task) => {
    if (task.assignedUsers.includes(userName) && task.effortByUser) {
      return total + (task.effortByUser[userName] || 0);
    }
    return total;
  }, 0);
};
