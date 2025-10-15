import { Task, Team, TaskType } from '@types';
import { calculateEffortByUser } from './effortCalculator';

/**
 * Expands tasks into multiple instances based on team efforts configuration
 * Creates separate task instances for:
 * - Development (one per assigned developer)
 * - Review (one per assigned reviewer per team)
 * - Stabilization (one per assigned developer after review)
 *
 * Each developer has their own independent workflow:
 * Developer1: Task1-dev → Task1-review → Task1-correction → Task2-dev → ...
 * Developer2: Task1-dev → Task1-review → Task1-correction → Task2-dev → ...
 *
 * Tasks are processed in priority order per developer (high priority first, then file order)
 */
export function expandTasksWithTeams(tasks: Task[], teams: Team[]): Task[] {
  const priorityOrder = { Alta: 1, Media: 2, Baja: 3 };
  const expandedTasks: Task[] = [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Track round-robin index per team for fair distribution
  const teamRoundRobinIndex = new Map<string, number>();
  teams.forEach((team) => {
    teamRoundRobinIndex.set(team.id, 0);
  });

  const devTeam = teamMap.get('dev');
  if (!devTeam) {
    throw new Error('Development team not found');
  }

  // Get all unique developers across all tasks
  const allDevelopers = new Set<string>();
  tasks.forEach((task) => {
    task.assignedUsers.forEach((user) => allDevelopers.add(user));
  });

  // FOR EACH DEVELOPER, process their tasks by priority first, then file order
  allDevelopers.forEach((userName) => {
    // Get tasks assigned to this developer
    const developerTasks = tasks
      .filter((task) => task.assignedUsers.includes(userName))
      .sort((a, b) => {
        // Sort by priority first
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;

        // Then by file order (preserve input order)
        return tasks.indexOf(a) - tasks.indexOf(b);
      });

    // Process each task for this developer
    developerTasks.forEach((task, taskIndex) => {
      // Get enabled teams for this task
      const enabledTeams = teams.filter((t) => t.id !== 'dev' && task.teamEfforts[t.id]?.enabled);

      const devEffortByUser = calculateEffortByUser(
        task.effortBase,
        task.assignedUsers,
        devTeam.users
      );

      // Find original index in tasks array
      const originalTaskIndex = tasks.indexOf(task);
      const devTaskId = `${task.code}-dev-${userName.replace(/\s+/g, '-')}`;

      // Create development task
      expandedTasks.push({
        ...task,
        id: devTaskId,
        name: `${task.code} - Desarrollo`,
        team: 'dev',
        taskType: 'development',
        assignedUsers: [userName],
        effortByUser: { [userName]: devEffortByUser[userName] || task.effortBase },
        status: 'pending',
        originalTaskIndex: originalTaskIndex, // Preserve original file index
        developerTaskOrder: taskIndex, // Order for this developer (0, 1, 2...)
      });

      // Track the previous step ID for this developer's workflow
      let previousStepId = devTaskId;

      // Create review tasks for each enabled team (waterfall for this developer)
      for (const team of enabledTeams) {
        const teamEffort = task.teamEfforts[team.id];
        const reviewTaskName = teamEffort.reviewTaskName || 'Revisión';
        const reviewPriority = teamEffort.reviewPriority || task.priority;

        // For this developer, create a review task
        const reviewTaskId = `${task.code}-${team.id}-review-${userName.replace(/\s+/g, '-')}`;

        // Get reviewers for this review task (from team or auto-assign)
        let reviewers: string[] = [];
        if (teamEffort.reviewAssignedUsers && teamEffort.reviewAssignedUsers.length > 0) {
          reviewers = teamEffort.reviewAssignedUsers;
        } else if (team.users.length > 0) {
          reviewers = team.users.map((u) => u.name);
        }

        // Auto-assign reviewer using round-robin to distribute workload
        let assignedReviewer = userName; // Fallback to dev if no reviewers
        if (reviewers.length > 0) {
          const currentIndex = teamRoundRobinIndex.get(team.id) || 0;
          assignedReviewer = reviewers[currentIndex % reviewers.length];
          // Increment round-robin index for next assignment
          teamRoundRobinIndex.set(team.id, currentIndex + 1);
        }

        expandedTasks.push({
          ...task,
          id: reviewTaskId,
          name: `${task.code} - ${reviewTaskName} ${team.name}`,
          effortBase: teamEffort.reviewEffort,
          priority: reviewPriority,
          team: team.id,
          taskType: 'review',
          parentTaskId: task.id,
          assignedUsers: [assignedReviewer], // Assigned to reviewer from review team
          effortByUser: { [assignedReviewer]: teamEffort.reviewEffort },
          // Review depends on this developer's previous step
          dependsOn: [previousStepId],
          canStartInParallel: team.config.canWorkInParallel,
          status: 'blocked',
          originalTaskIndex: originalTaskIndex, // Preserve original file index
          developerTaskOrder: taskIndex, // Order for this developer
        });

        // Update previous step for potential corrections
        const correctionDependency = reviewTaskId;

        // Create correction/stabilization if enabled
        if (teamEffort.generateCorrection && teamEffort.correctionEffort > 0) {
          const followUpTeamId = team.config.correctionTeam || 'dev';
          const correctionTaskName = teamEffort.correctionTaskName || 'Estabilización';
          const correctionPriority = teamEffort.correctionPriority || task.priority;

          const correctionTaskId = `${task.code}-${team.id}-correction-${userName.replace(/\s+/g, '-')}`;

          expandedTasks.push({
            ...task,
            id: correctionTaskId,
            name: `${task.code} - ${correctionTaskName} ${team.name}`,
            effortBase: teamEffort.correctionEffort,
            priority: correctionPriority,
            team: followUpTeamId,
            taskType: 'stabilization',
            parentTaskId: task.id,
            assignedUsers: [userName], // Same developer does the correction
            effortByUser: { [userName]: teamEffort.correctionEffort },
            // Correction depends on the review
            dependsOn: [correctionDependency],
            canStartInParallel: false,
            interruptsCurrent: team.config.interruptsCurrent,
            status: 'blocked',
            originalTaskIndex: originalTaskIndex, // Preserve original file index
            developerTaskOrder: taskIndex, // Order for this developer
          });

          // Update previous step
          previousStepId = correctionTaskId;
        } else {
          // No correction, so review is the last step for this team
          previousStepId = reviewTaskId;
        }
      }
    });
  });

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
