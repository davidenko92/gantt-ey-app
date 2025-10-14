import { Task } from '@types';
import { dateUtils } from '@features/gantt/utils/dateUtils';

/**
 * Result of topological sort
 */
export interface TopologicalSortResult {
  valid: boolean;
  sortedTasks: Task[];
  errors: string[];
}

/**
 * Builds ancestor chain for a task
 * Returns all ancestor IDs (parent, parent's parent, etc.)
 */
function getAncestors(taskId: string, taskMap: Map<string, Task>): string[] {
  const ancestors: string[] = [];
  let current = taskMap.get(taskId);

  while (current && current.parentTaskId) {
    ancestors.push(current.parentTaskId);
    current = taskMap.get(current.parentTaskId);
  }

  return ancestors;
}

/**
 * Finds all descendants of a task (children, grandchildren, etc.)
 */
function getDescendants(taskId: string, taskMap: Map<string, Task>): string[] {
  const descendants: string[] = [];
  const toVisit = [taskId];
  const visited = new Set<string>();

  while (toVisit.length > 0) {
    const currentId = toVisit.pop()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    // Find all tasks that have this task as parent
    taskMap.forEach((task, id) => {
      if (task.parentTaskId === currentId && !visited.has(id)) {
        descendants.push(id);
        toVisit.push(id);
      }
    });
  }

  return descendants;
}

/**
 * Applies downstream-first (child-lock) rule:
 * When task Y is created "for" an ancestor A (Y has A as ancestor via parentTaskId chain),
 * A cannot proceed until Y completes.
 *
 * Implementation: For each task, if it's an ancestor (has descendants),
 * add ALL its descendants as explicit dependencies.
 */
export function applyChildLockDependencies(tasks: Task[]): Task[] {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const taskDependencies = new Map<string, Set<string>>();

  // Initialize dependencies with existing dependsOn
  for (const task of tasks) {
    const deps = new Set<string>([...(task.dependsOn || [])]);
    // Parent is always a dependency, BUT only if it exists in the task array
    // (after task expansion, original parent tasks may not exist anymore)
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      deps.add(task.parentTaskId);
    }
    taskDependencies.set(task.id, deps);
  }

  // For each task, find all its descendants and add them as dependencies
  for (const task of tasks) {
    const descendants = getDescendants(task.id, taskMap);

    if (descendants.length > 0) {
      // This task has descendants, so it depends on ALL of them completing
      const deps = taskDependencies.get(task.id)!;
      descendants.forEach((descId) => deps.add(descId));
    }
  }

  // Build updated tasks with new dependencies
  return tasks.map((task) => {
    const deps = taskDependencies.get(task.id)!;
    // Remove self-dependency if present
    deps.delete(task.id);

    return {
      ...task,
      dependsOn: Array.from(deps),
    };
  });
}

/**
 * Detects cycles in task dependency graph using DFS
 * Returns the task IDs involved in the cycle, or null if no cycle
 */
function detectCycle(
  taskId: string,
  taskMap: Map<string, Task>,
  visited: Set<string>,
  recStack: Set<string>,
  path: string[]
): string[] | null {
  visited.add(taskId);
  recStack.add(taskId);
  path.push(taskId);

  const task = taskMap.get(taskId);
  if (!task) return null;

  // Get all dependencies including parent (only if parent exists)
  const allDeps = [...(task.dependsOn || [])];
  if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
    allDeps.push(task.parentTaskId);
  }

  for (const depId of allDeps) {
    if (!taskMap.has(depId)) continue;

    if (!visited.has(depId)) {
      const cycle = detectCycle(depId, taskMap, visited, recStack, path);
      if (cycle) return cycle;
    } else if (recStack.has(depId)) {
      // Found cycle - return path from depId to current
      const cycleStart = path.indexOf(depId);
      return path.slice(cycleStart);
    }
  }

  recStack.delete(taskId);
  path.pop();
  return null;
}

/**
 * Performs topological sort on tasks based on dependencies and parentTaskId
 * Treats parentTaskId as an additional dependency
 * Returns sorted tasks or errors if cycles detected
 */
export function topologicalSortTasks(tasks: Task[]): TopologicalSortResult {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const visited = new Set<string>();
  const result: Task[] = [];
  const errors: string[] = [];

  // Check for cycles first
  const globalVisited = new Set<string>();
  const recStack = new Set<string>();

  for (const task of tasks) {
    if (!globalVisited.has(task.id)) {
      const cycle = detectCycle(task.id, taskMap, globalVisited, recStack, []);
      if (cycle) {
        errors.push(`Dependencia circular detectada: ${cycle.join(' → ')}`);
        return { valid: false, sortedTasks: [], errors };
      }
    }
  }

  // DFS to build topological order
  function visit(task: Task) {
    if (visited.has(task.id)) return;
    visited.add(task.id);

    // Get all dependencies including parent (only if parent exists)
    const allDeps = [...(task.dependsOn || [])];
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      allDeps.push(task.parentTaskId);
    }

    // Visit all dependencies first
    for (const depId of allDeps) {
      const depTask = taskMap.get(depId);
      if (depTask) {
        visit(depTask);
      }
    }

    // Add task after all dependencies
    result.push(task);
  }

  // Visit all tasks
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      visit(task);
    }
  }

  return { valid: true, sortedTasks: result, errors: [] };
}

/**
 * Recalculates task dates based on dependencies
 * Each task starts after all its dependencies (including parent) have ended
 * Returns new array with updated dates (does not mutate input)
 */
export function recalculateTaskDates(tasks: Task[]): Task[] {
  // First, topologically sort tasks
  const sortResult = topologicalSortTasks(tasks);
  if (!sortResult.valid) {
    throw new Error(`No se pueden recalcular fechas: ${sortResult.errors.join(', ')}`);
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const updatedTaskMap = new Map<string, Task>();

  // Process tasks in topological order
  for (const task of sortResult.sortedTasks) {
    let newStartDate = task.startDate ? new Date(task.startDate) : new Date();

    // Get all dependencies including parent (only if parent exists)
    const allDeps = [...(task.dependsOn || [])];
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      allDeps.push(task.parentTaskId);
    }

    // Find the latest end date among all dependencies
    let latestDepEnd: Date | null = null;

    for (const depId of allDeps) {
      // Check updated tasks first, then original
      const depTask = updatedTaskMap.get(depId) || taskMap.get(depId);
      if (depTask && depTask.endDate) {
        const depEnd = new Date(depTask.endDate);
        if (!latestDepEnd || depEnd > latestDepEnd) {
          latestDepEnd = depEnd;
        }
      }
    }

    // If there are dependencies, task must start after the latest one ends
    if (latestDepEnd) {
      // Get next working day after dependency ends (skip weekends)
      const dayAfterLatestDep = dateUtils.getNextWorkingDay(latestDepEnd);

      // Use the later of: current start date or day after dependency
      if (dayAfterLatestDep > newStartDate) {
        newStartDate = dayAfterLatestDep;
      }
    }

    // Calculate duration from effortByUser or effortBase
    let durationDays = task.effortBase;
    if (task.effortByUser && task.assignedUsers.length > 0) {
      const userName = task.assignedUsers[0];
      durationDays = task.effortByUser[userName] || task.effortBase;
    }

    // Calculate end date using business days (excluding weekends)
    // If task has N days duration, it should span from day 1 to day N
    // addBusinessDays adds days AFTER the start date, so we subtract 1
    const newEndDate = dateUtils.addBusinessDays(newStartDate, durationDays - 1);

    // Create updated task (immutable)
    const updatedTask: Task = {
      ...task,
      startDate: newStartDate,
      endDate: newEndDate,
    };

    updatedTaskMap.set(task.id, updatedTask);
  }

  // Return updated tasks in original order
  return tasks.map((t) => updatedTaskMap.get(t.id) || t);
}

/**
 * Validates that all tasks respect their dependencies
 * Returns errors if any task starts before its dependencies end
 */
export function validateTaskDependencies(tasks: Task[]): { valid: boolean; errors: string[] } {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const errors: string[] = [];

  for (const task of tasks) {
    if (!task.startDate || !task.endDate) {
      errors.push(`Tarea ${task.id} no tiene fechas asignadas`);
      continue;
    }

    // Get all dependencies including parent (only if parent exists)
    const allDeps = [...(task.dependsOn || [])];
    if (task.parentTaskId && taskMap.has(task.parentTaskId)) {
      allDeps.push(task.parentTaskId);
    }

    for (const depId of allDeps) {
      const depTask = taskMap.get(depId);
      if (!depTask) {
        errors.push(`Tarea ${task.id} depende de ${depId} que no existe`);
        continue;
      }

      if (!depTask.endDate) {
        errors.push(`Dependencia ${depId} de tarea ${task.id} no tiene fecha de fin`);
        continue;
      }

      // Task must start AFTER dependency ends
      if (task.startDate <= depTask.endDate) {
        errors.push(
          `Tarea ${task.id} empieza ${task.startDate.toLocaleDateString()} antes/cuando termina dependencia ${depId} (${depTask.endDate.toLocaleDateString()})`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
