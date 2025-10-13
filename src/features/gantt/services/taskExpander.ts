import { Task, Team, TaskType } from '@types';
import { calculateEffortByUser } from './effortCalculator';

/**
 * Expands tasks into multiple instances based on team efforts configuration
 * Creates separate task instances for:
 * - Development (one per assigned developer)
 * - Review (one per assigned reviewer per team)
 * - Correction (one per assigned corrector per team)
 */
export function expandTasksWithTeams(tasks: Task[], teams: Team[]): Task[] {
  const expandedTasks: Task[] = [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  for (const task of tasks) {
    const devTeam = teamMap.get('dev');
    if (!devTeam) {
      throw new Error('Development team not found');
    }

    // 1. Create development task instances (one per developer)
    const devEffortByUser = calculateEffortByUser(
      task.effortBase,
      task.assignedUsers,
      devTeam.users
    );

    task.assignedUsers.forEach((userName) => {
      expandedTasks.push({
        ...task,
        id: `${task.code}-dev-${userName.replace(/\s+/g, '-')}`,
        name: `${task.code} - Desarrollo`,
        team: 'dev',
        taskType: 'development',
        assignedUsers: [userName],
        effortByUser: { [userName]: devEffortByUser[userName] || task.effortBase },
        status: 'pending',
      });
    });

    // 2. For each enabled team, create review and correction tasks
    for (const team of teams.filter((t) => t.id !== 'dev')) {
      const teamEffort = task.teamEfforts[team.id];

      if (!teamEffort?.enabled) continue;

      // 2a. Create review task instances (one per reviewer)
      const reviewUsers = teamEffort.reviewAssignedUsers || [];

      if (reviewUsers.length === 0) {
        // Auto-assign to first available user in team
        if (team.users.length > 0) {
          reviewUsers.push(team.users[0].name);
        }
      }

      const reviewEffortByUser = calculateEffortByUser(
        teamEffort.reviewEffort,
        reviewUsers,
        team.users
      );

      reviewUsers.forEach((userName) => {
        expandedTasks.push({
          ...task,
          id: `${task.code}-${team.id}-review-${userName.replace(/\s+/g, '-')}`,
          name: `${task.code} - Revisión ${team.name}`,
          effortBase: reviewEffortByUser[userName] || teamEffort.reviewEffort,
          team: team.id,
          taskType: 'review',
          parentTaskId: task.id,
          assignedUsers: [userName],
          effortByUser: { [userName]: reviewEffortByUser[userName] || teamEffort.reviewEffort },
          dependsOn: [`${task.code}-dev-${task.assignedUsers[0].replace(/\s+/g, '-')}`],
          canStartInParallel: team.config.canWorkInParallel,
          status: 'blocked',
        });
      });

      // 2b. Create correction task instances (if configured)
      if (team.config.triggersCorrection && teamEffort.correctionEffort > 0) {
        const correctionTeamId = team.config.correctionTeam || 'dev';
        const correctionTeam = teamMap.get(correctionTeamId);

        if (!correctionTeam) {
          console.warn(`Correction team ${correctionTeamId} not found`);
          continue;
        }

        const correctionUsers = teamEffort.correctionAssignedUsers || task.assignedUsers;

        const correctionEffortByUser = calculateEffortByUser(
          teamEffort.correctionEffort,
          correctionUsers,
          correctionTeam.users
        );

        correctionUsers.forEach((userName) => {
          expandedTasks.push({
            ...task,
            id: `${task.code}-${team.id}-correction-${userName.replace(/\s+/g, '-')}`,
            name: `${task.code} - Corrección ${team.name}`,
            effortBase: correctionEffortByUser[userName] || teamEffort.correctionEffort,
            priority: team.config.correctionPriority,
            team: correctionTeamId,
            taskType: 'correction',
            parentTaskId: task.id,
            assignedUsers: [userName],
            effortByUser: {
              [userName]: correctionEffortByUser[userName] || teamEffort.correctionEffort,
            },
            dependsOn: [`${task.code}-${team.id}-review-${reviewUsers[0].replace(/\s+/g, '-')}`],
            canStartInParallel: false,
            interruptsCurrent: team.config.interruptsCurrent,
            status: 'blocked',
          });
        });
      }
    }
  }

  return expandedTasks;
}

/**
 * Gets the default team effort for a team based on task and team config
 */
export function getDefaultTeamEffort(task: Task, team: Team) {
  const defaultPercent = team.config.defaultReviewEffortPercent || 100;
  const reviewEffort = Math.ceil((task.effortBase * defaultPercent) / 100);

  return {
    enabled: false,
    reviewEffort,
    reviewAssignedUsers: [],
    correctionEffort: team.config.defaultCorrectionDays || 1,
    correctionAssignedUsers: [],
  };
}
