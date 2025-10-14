import { Task } from '@types';
import {
  topologicalSortTasks,
  recalculateTaskDates,
  validateTaskDependencies,
} from './dependencyResolver';

describe('dependencyResolver', () => {
  describe('topologicalSortTasks', () => {
    it('should sort tasks in linear chain correctly', () => {
      const tasks: Task[] = [
        {
          id: 'task-3',
          name: 'Task 3',
          code: 'T3',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-2'],
          teamEfforts: {},
        },
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          teamEfforts: {},
        },
      ];

      const result = topologicalSortTasks(tasks);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.sortedTasks.map((t) => t.id)).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('should handle multiple dependencies correctly', () => {
      const tasks: Task[] = [
        {
          id: 'task-4',
          name: 'Task 4',
          code: 'T4',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-2', 'task-3'],
          teamEfforts: {},
        },
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          teamEfforts: {},
        },
        {
          id: 'task-3',
          name: 'Task 3',
          code: 'T3',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          teamEfforts: {},
        },
      ];

      const result = topologicalSortTasks(tasks);

      expect(result.valid).toBe(true);
      expect(result.sortedTasks[0].id).toBe('task-1');
      expect(result.sortedTasks[3].id).toBe('task-4');
      // task-2 and task-3 can be in any order
      expect(['task-2', 'task-3']).toContain(result.sortedTasks[1].id);
      expect(['task-2', 'task-3']).toContain(result.sortedTasks[2].id);
    });

    it('should detect simple cycle', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-2'],
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          teamEfforts: {},
        },
      ];

      const result = topologicalSortTasks(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Dependencia circular');
    });

    it('should detect complex cycle', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-2'],
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-3'],
          teamEfforts: {},
        },
        {
          id: 'task-3',
          name: 'Task 3',
          code: 'T3',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          teamEfforts: {},
        },
      ];

      const result = topologicalSortTasks(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Dependencia circular');
    });

    it('should treat parentTaskId as dependency', () => {
      const tasks: Task[] = [
        {
          id: 'child',
          name: 'Child',
          code: 'C1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          parentTaskId: 'parent',
          teamEfforts: {},
        },
        {
          id: 'parent',
          name: 'Parent',
          code: 'P1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          teamEfforts: {},
        },
      ];

      const result = topologicalSortTasks(tasks);

      expect(result.valid).toBe(true);
      expect(result.sortedTasks.map((t) => t.id)).toEqual(['parent', 'child']);
    });
  });

  describe('recalculateTaskDates', () => {
    it('should recalculate dates for linear chain', () => {
      const baseDate = new Date('2025-01-01');
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 3,
          priority: 'Media',
          assignedUsers: ['User1'],
          team: 'dev',
          effortByUser: { User1: 3 },
          startDate: baseDate,
          endDate: new Date('2025-01-03'),
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 2,
          priority: 'Media',
          assignedUsers: ['User1'],
          team: 'dev',
          effortByUser: { User1: 2 },
          dependsOn: ['task-1'],
          startDate: baseDate, // Wrong date, should be after task-1
          endDate: baseDate,
          teamEfforts: {},
        },
      ];

      const result = recalculateTaskDates(tasks);

      expect(result[0].id).toBe('task-1');
      expect(result[0].startDate).toEqual(baseDate);
      expect(result[0].endDate).toEqual(new Date('2025-01-03')); // 1 + (3-1) = 3

      expect(result[1].id).toBe('task-2');
      expect(result[1].startDate).toEqual(new Date('2025-01-04')); // Day after task-1 ends
      expect(result[1].endDate).toEqual(new Date('2025-01-05')); // 4 + (2-1) = 5
    });

    it('should handle multiple dependencies', () => {
      const baseDate = new Date('2025-01-01');
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 2,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: baseDate,
          endDate: new Date('2025-01-02'),
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 3,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: baseDate,
          endDate: new Date('2025-01-04'), // Ends later than task-1
          teamEfforts: {},
        },
        {
          id: 'task-3',
          name: 'Task 3',
          code: 'T3',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1', 'task-2'],
          startDate: baseDate,
          endDate: baseDate,
          teamEfforts: {},
        },
      ];

      const result = recalculateTaskDates(tasks);

      // task-3 should start after the LATEST dependency (task-2) ends
      expect(result[2].startDate).toEqual(new Date('2025-01-05'));
    });

    it('should not mutate input array', () => {
      const baseDate = new Date('2025-01-01');
      const originalTasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: baseDate,
          endDate: baseDate,
          teamEfforts: {},
        },
      ];

      const originalStartDate = originalTasks[0].startDate;
      recalculateTaskDates(originalTasks);

      expect(originalTasks[0].startDate).toBe(originalStartDate);
    });
  });

  describe('validateTaskDependencies', () => {
    it('should pass validation for correct dependencies', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-03'),
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          startDate: new Date('2025-01-04'), // Correctly after task-1
          endDate: new Date('2025-01-05'),
          teamEfforts: {},
        },
      ];

      const result = validateTaskDependencies(tasks);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should fail validation when task starts before dependency ends', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          name: 'Task 1',
          code: 'T1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-05'),
          teamEfforts: {},
        },
        {
          id: 'task-2',
          name: 'Task 2',
          code: 'T2',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          dependsOn: ['task-1'],
          startDate: new Date('2025-01-03'), // Wrong: before task-1 ends
          endDate: new Date('2025-01-04'),
          teamEfforts: {},
        },
      ];

      const result = validateTaskDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('task-2');
      expect(result.errors[0]).toContain('task-1');
    });

    it('should validate parentTaskId as dependency', () => {
      const tasks: Task[] = [
        {
          id: 'parent',
          name: 'Parent',
          code: 'P1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-05'),
          teamEfforts: {},
        },
        {
          id: 'child',
          name: 'Child',
          code: 'C1',
          effortBase: 1,
          priority: 'Media',
          assignedUsers: [],
          team: 'dev',
          parentTaskId: 'parent',
          startDate: new Date('2025-01-03'), // Wrong: before parent ends
          endDate: new Date('2025-01-04'),
          teamEfforts: {},
        },
      ];

      const result = validateTaskDependencies(tasks);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('child');
    });
  });
});
