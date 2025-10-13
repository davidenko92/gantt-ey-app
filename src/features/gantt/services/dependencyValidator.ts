import { Team } from '@types';

/**
 * Validates that team dependencies don't create circular references
 * Uses depth-first search to detect cycles in the dependency graph
 */
export function validateTeamDependencies(teams: Team[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const teamMap = new Map(teams.map((t) => [t.id, t]));

  // Check that all dependency references exist
  for (const team of teams) {
    if (team.config.dependsOn) {
      if (!teamMap.has(team.config.dependsOn)) {
        errors.push(`El equipo '${team.name}' depende de '${team.config.dependsOn}' que no existe`);
      }
    }

    if (team.config.correctionTeam) {
      if (!teamMap.has(team.config.correctionTeam)) {
        errors.push(
          `El equipo '${team.name}' tiene correctionTeam '${team.config.correctionTeam}' que no existe`
        );
      }
    }
  }

  // If references are invalid, don't check for cycles
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Detect circular dependencies using DFS
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const hasCycle = (teamId: string): boolean => {
    if (visiting.has(teamId)) {
      // Found a cycle
      return true;
    }

    if (visited.has(teamId)) {
      // Already checked this path
      return false;
    }

    const team = teamMap.get(teamId);
    if (!team || !team.config.dependsOn) {
      // No dependencies, no cycle
      visited.add(teamId);
      return false;
    }

    visiting.add(teamId);

    // Check if the dependency has a cycle
    if (hasCycle(team.config.dependsOn)) {
      errors.push(`Dependencia circular detectada que incluye al equipo '${team.name}'`);
      visiting.delete(teamId);
      return true;
    }

    visiting.delete(teamId);
    visited.add(teamId);
    return false;
  };

  // Check each team for cycles
  for (const team of teams) {
    if (!visited.has(team.id)) {
      hasCycle(team.id);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sorts teams in execution order based on dependencies
 * Teams with no dependencies come first, then those that depend on them, etc.
 */
export function sortTeamsByDependencies(teams: Team[]): Team[] {
  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const sorted: Team[] = [];
  const visited = new Set<string>();

  const visit = (teamId: string) => {
    if (visited.has(teamId)) return;

    const team = teamMap.get(teamId);
    if (!team) return;

    // Visit dependency first
    if (team.config.dependsOn) {
      visit(team.config.dependsOn);
    }

    visited.add(teamId);
    sorted.push(team);
  };

  // Process teams in executionOrder if specified, otherwise natural order
  const orderedTeams = [...teams].sort((a, b) => {
    const orderA = a.config.executionOrder ?? Infinity;
    const orderB = b.config.executionOrder ?? Infinity;
    return orderA - orderB;
  });

  for (const team of orderedTeams) {
    visit(team.id);
  }

  return sorted;
}

/**
 * Validates that a task's teamEfforts configuration is valid
 */
export function validateTaskTeamEfforts(
  taskCode: string,
  teamEfforts: Record<string, any>,
  teams: Team[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const teamIds = new Set(teams.map((t) => t.id));

  // Check that all referenced teams exist
  for (const teamId of Object.keys(teamEfforts)) {
    if (!teamIds.has(teamId)) {
      errors.push(`Tarea ${taskCode}: El equipo '${teamId}' no existe en la configuración`);
    }
  }

  // Validate effort values
  for (const [teamId, effort] of Object.entries(teamEfforts)) {
    const teamEffort = effort as any;

    if (teamEffort.enabled) {
      if (
        typeof teamEffort.reviewEffort !== 'number' ||
        teamEffort.reviewEffort < 0 ||
        !Number.isFinite(teamEffort.reviewEffort)
      ) {
        errors.push(
          `Tarea ${taskCode}: reviewEffort inválido para equipo '${teamId}' (debe ser número >= 0)`
        );
      }

      if (
        typeof teamEffort.correctionEffort !== 'number' ||
        teamEffort.correctionEffort < 0 ||
        !Number.isFinite(teamEffort.correctionEffort)
      ) {
        errors.push(
          `Tarea ${taskCode}: correctionEffort inválido para equipo '${teamId}' (debe ser número >= 0)`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
