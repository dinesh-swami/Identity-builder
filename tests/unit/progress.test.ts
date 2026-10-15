import { describe, it, expect } from 'vitest';
import {
  calculateWeightedProgress,
  computeWeeklyMilestoneProgress,
  computeMonthlyMilestoneProgress,
  computeGoalProgress,
  TaskItem,
  WeeklyMilestoneItem,
  MonthlyMilestoneItem,
} from '../../src/lib/domain/progress';

describe('Goal Progress Algorithm & Hierarchy Rollup', () => {
  it('implements strict binary completion for daily tasks (TODO=0, IN_PROGRESS=0, COMPLETED=1)', () => {
    const tasks: TaskItem[] = [
      { id: '1', status: 'TODO', weight: 1 },
      { id: '2', status: 'IN_PROGRESS', weight: 1 },
      { id: '3', status: 'COMPLETED', weight: 1 },
    ];

    const result = computeWeeklyMilestoneProgress(tasks);
    // 1 completed out of 3 eligible tasks = 33.3%
    expect(result.eligibleCount).toBe(3);
    expect(result.completedCount).toBe(1);
    expect(result.progressPercentage).toBe(33.3);
  });

  it('excludes cancelled tasks from the denominator and preserves cancellation count', () => {
    const tasks: TaskItem[] = [
      { id: '1', status: 'COMPLETED', weight: 1 },
      { id: '2', status: 'CANCELLED', weight: 1 },
      { id: '3', status: 'TODO', weight: 1 },
    ];

    const result = computeWeeklyMilestoneProgress(tasks);
    // 1 completed out of 2 eligible tasks = 50.0%
    expect(result.eligibleCount).toBe(2);
    expect(result.cancelledCount).toBe(1);
    expect(result.progressPercentage).toBe(50.0);
  });

  it('handles empty children or all-cancelled tasks gracefully without division by zero', () => {
    const emptyResult = computeWeeklyMilestoneProgress([]);
    expect(emptyResult.isUnplannedOrEmpty).toBe(true);
    expect(emptyResult.progressPercentage).toBe(0);

    const allCancelled: TaskItem[] = [
      { id: '1', status: 'CANCELLED', weight: 1 },
      { id: '2', status: 'CANCELLED', weight: 2 },
    ];
    const cancelledResult = computeWeeklyMilestoneProgress(allCancelled);
    expect(cancelledResult.isUnplannedOrEmpty).toBe(true);
    expect(cancelledResult.progressPercentage).toBe(0);
    expect(cancelledResult.cancelledCount).toBe(2);
  });

  it('correctly weighs tasks with different weights', () => {
    const tasks: TaskItem[] = [
      { id: '1', status: 'COMPLETED', weight: 3 }, // weight 3
      { id: '2', status: 'TODO', weight: 1 },      // weight 1
    ];

    const result = computeWeeklyMilestoneProgress(tasks);
    // completed weight 3 out of total weight 4 = 75.0%
    expect(result.totalEligibleWeight).toBe(4);
    expect(result.completedWeight).toBe(3);
    expect(result.progressPercentage).toBe(75.0);
  });

  it('hierarchically rolls up Daily Tasks -> Weekly Milestone -> Monthly Milestone -> Goal', () => {
    // Week 1 has 2 completed tasks out of 2 = 100%
    const week1Tasks: TaskItem[] = [
      { id: 't1', status: 'COMPLETED', weight: 1 },
      { id: 't2', status: 'COMPLETED', weight: 1 },
    ];
    // Week 2 has 1 completed out of 2 = 50%
    const week2Tasks: TaskItem[] = [
      { id: 't3', status: 'COMPLETED', weight: 1 },
      { id: 't4', status: 'TODO', weight: 1 },
    ];

    const weeklyMilestones: WeeklyMilestoneItem[] = [
      { id: 'w1', status: 'IN_PROGRESS', weight: 1, tasks: week1Tasks },
      { id: 'w2', status: 'IN_PROGRESS', weight: 1, tasks: week2Tasks },
    ];

    // Monthly milestone progress: average of 100% and 50% = 75.0%
    const monthResult = computeMonthlyMilestoneProgress(weeklyMilestones);
    expect(monthResult.progressPercentage).toBe(75.0);

    // Goal with 2 Monthly Milestones: Month 1 is 75%, Month 2 is 25%
    const monthlyMilestones: MonthlyMilestoneItem[] = [
      { id: 'm1', status: 'IN_PROGRESS', weight: 1, weeklyMilestones },
      {
        id: 'm2',
        status: 'IN_PROGRESS',
        weight: 1,
        weeklyMilestones: [
          {
            id: 'w3',
            status: 'IN_PROGRESS',
            weight: 1,
            tasks: [
              { id: 't5', status: 'COMPLETED', weight: 1 },
              { id: 't6', status: 'TODO', weight: 3 }, // 1 / 4 = 25%
            ],
          },
        ],
      },
    ];

    const goalResult = computeGoalProgress(monthlyMilestones);
    // Month 1 = 75%, Month 2 = 25% -> Goal = 50.0%
    expect(goalResult.progressPercentage).toBe(50.0);
  });
});
