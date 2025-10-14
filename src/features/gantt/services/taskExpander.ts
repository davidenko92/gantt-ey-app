import { Task, Team, TaskType } from '@types';
import { calculateEffortByUser } from './effortCalculator';

/**
 * Expands tasks into multiple instances based on team efforts configuration
 * Creates separate task instances for:
 * - Development (one per assigned developer)
 * - Review (one per assigned reviewer per team)
 * - Stabilization (one per assigned developer after review)
 */
export function expandTasksWithTeams(tasks: Task[], teams: Team[]): Task[] {
  const expandedTasks: Task[] = [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Track workload per team to enable round-robin auto-assignment
  const teamWorkload = new Map<string, number[]>();
  teams.forEach((team) => {
    teamWorkload.set(team.id, new Array(team.users.length).fill(0));
  });

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

    // Track all dev task IDs for this task
    const allDevTaskIds: string[] = [];

    task.assignedUsers.forEach((userName) => {
      const devTaskId = `${task.code}-dev-${userName.replace(/\s+/g, '-')}`;
      allDevTaskIds.push(devTaskId);

      expandedTasks.push({
        ...task,
        id: devTaskId,
        name: `${task.code} - Desarrollo`,
        team: 'dev',
        taskType: 'development',
        assignedUsers: [userName],
        effortByUser: { [userName]: devEffortByUser[userName] || task.effortBase },
        status: 'pending',
      });
    });

    // 2. For each enabled team, create review and correction tasks
    // Track previous team's task IDs (starts with dev)
    let previousTeamTaskIds = allDevTaskIds;

    for (const team of teams.filter((t) => t.id !== 'dev')) {
      const teamEffort = task.teamEfforts[team.id];

      if (!teamEffort?.enabled) continue;

      // 2a. Create review task instances (one per reviewer)
      let reviewUsers = teamEffort.reviewAssignedUsers || [];

      if (reviewUsers.length === 0 && team.users.length > 0) {
        // Auto-assign using round-robin to distribute workload evenly
        const workload = teamWorkload.get(team.id) || [];
        const minWorkloadIndex = workload.indexOf(Math.min(...workload));
        reviewUsers = [team.users[minWorkloadIndex].name];
        workload[minWorkloadIndex] += teamEffort.reviewEffort;
      }

      const reviewEffortByUser = calculateEffortByUser(
        teamEffort.reviewEffort,
        reviewUsers,
        team.users
      );

      const reviewTaskName = teamEffort.reviewTaskName || 'Revisión';
      const reviewPriority = teamEffort.reviewPriority || task.priority;

      // Track all review task IDs for this team
      const currentTeamTaskIds: string[] = [];

      reviewUsers.forEach((userName) => {
        const reviewTaskId = `${task.code}-${team.id}-review-${userName.replace(/\s+/g, '-')}`;
        currentTeamTaskIds.push(reviewTaskId);

        expandedTasks.push({
          ...task,
          id: reviewTaskId,
          name: `${task.code} - ${reviewTaskName} ${team.name}`,
          effortBase: reviewEffortByUser[userName] || teamEffort.reviewEffort,
          priority: reviewPriority,
          team: team.id,
          taskType: 'review',
          parentTaskId: task.id,
          assignedUsers: [userName],
          effortByUser: { [userName]: reviewEffortByUser[userName] || teamEffort.reviewEffort },
          // THIS TEAM depends on ALL tasks from the PREVIOUS team completing
          dependsOn: previousTeamTaskIds,
          canStartInParallel: team.config.canWorkInParallel,
          status: 'blocked',
        });
      });

      // 2b. Create follow-up task instances (if enabled and configured)
      if (teamEffort.generateCorrection && teamEffort.correctionEffort > 0) {
        const followUpTeamId = team.config.correctionTeam || 'dev';
        const followUpTeam = teamMap.get(followUpTeamId);

        if (!followUpTeam) {
          console.warn(`Follow-up team ${followUpTeamId} not found`);
          continue;
        }

        let followUpUsers = teamEffort.correctionAssignedUsers || [];

        // If no users specified, use original developers
        if (followUpUsers.length === 0) {
          followUpUsers = task.assignedUsers;
        }

        const followUpEffortByUser = calculateEffortByUser(
          teamEffort.correctionEffort,
          followUpUsers,
          followUpTeam.users
        );

        const correctionTaskName = teamEffort.correctionTaskName || 'Estabilización';
        const correctionPriority = teamEffort.correctionPriority || task.priority;

        // Track correction task IDs
        const correctionTaskIds: string[] = [];

        followUpUsers.forEach((userName) => {
          const correctionTaskId = `${task.code}-${team.id}-correction-${userName.replace(/\s+/g, '-')}`;
          correctionTaskIds.push(correctionTaskId);

          expandedTasks.push({
            ...task,
            id: correctionTaskId,
            name: `${task.code} - ${correctionTaskName} ${team.name}`,
            effortBase: followUpEffortByUser[userName] || teamEffort.correctionEffort,
            priority: correctionPriority,
            team: followUpTeamId,
            taskType: 'stabilization',
            parentTaskId: task.id,
            assignedUsers: [userName],
            effortByUser: {
              [userName]: followUpEffortByUser[userName] || teamEffort.correctionEffort,
            },
            // Correction depends on ALL review tasks from THIS team
            dependsOn: currentTeamTaskIds,
            canStartInParallel: false,
            interruptsCurrent: team.config.interruptsCurrent,
            status: 'blocked',
          });
        });

        // If corrections were generated, they become the "current team" for next iteration
        currentTeamTaskIds.push(...correctionTaskIds);
      }

      // Update previousTeamTaskIds for next team iteration
      // Next team must wait for ALL tasks from this team (review + optional correction)
      previousTeamTaskIds = currentTeamTaskIds;
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
    reviewTaskName: 'Revisión', // Default name
    reviewPriority: task.priority, // Use task priority by default
    correctionEffort: team.config.defaultCorrectionDays || 1,
    correctionAssignedUsers: [],
    correctionTaskName: 'Estabilización', // Default name
    correctionPriority: task.priority, // Use task priority by default
    generateCorrection: false, // Disabled by default
  };
}
