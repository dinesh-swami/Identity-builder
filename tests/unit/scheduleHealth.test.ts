import { describe, it, expect } from 'vitest';
import { calculateScheduleHealth } from '../../src/lib/domain/scheduleHealth';

describe('Schedule Health & Forecast Algorithm', () => {
  it('correctly calculates planned progress, actual progress, and progress gap', () => {
    // 100 days total: from Day 0 to Day 100.
    // Cutoff is Day 50 -> planned progress should be 50.0%
    // If actual progress is 30.0% -> gap is -20.0%
    const report = calculateScheduleHealth({
      startDate: '2026-01-01',
      originalTargetDate: '2026-04-11', // approx 100 days
      currentTargetDate: '2026-04-11',
      actualProgress: 30,
      cutoffDate: '2026-02-20', // approx 50 days in
    });

    expect(report.actualProgress).toBe(30);
    expect(report.plannedProgress).toBeGreaterThan(45);
    expect(report.plannedProgress).toBeLessThan(55);
    expect(report.progressGap).toBeLessThan(-15);
  });

  it('calculates deadline delay in days between original deadline and revised target/completion date', () => {
    const report = calculateScheduleHealth({
      startDate: '2026-01-01',
      originalTargetDate: '2026-03-01',
      currentTargetDate: '2026-03-15', // Delayed by 14 days
      actualProgress: 50,
      cutoffDate: '2026-02-01',
    });

    expect(report.deadlineDelayDays).toBe(14);
    expect(report.forecastStatus).toBe('AT_RISK');
  });

  it('accurately identifies overdue tasks and calculates on-time completion rate', () => {
    const report = calculateScheduleHealth({
      startDate: '2026-01-01',
      originalTargetDate: '2026-03-01',
      currentTargetDate: '2026-03-01',
      actualProgress: 50,
      cutoffDate: '2026-02-15',
      tasks: [
        // Task 1: completed on time
        {
          status: 'COMPLETED',
          originalPlannedDate: '2026-02-01',
          currentPlannedDate: '2026-02-01',
          completedAt: '2026-02-01',
        },
        // Task 2: completed late (after original deadline)
        {
          status: 'COMPLETED',
          originalPlannedDate: '2026-02-05',
          currentPlannedDate: '2026-02-10',
          completedAt: '2026-02-10',
        },
        // Task 3: overdue (due 2026-02-10, incomplete as of cutoff 2026-02-15)
        {
          status: 'TODO',
          originalPlannedDate: '2026-02-10',
          currentPlannedDate: '2026-02-10',
        },
        // Task 4: future task (due 2026-02-20, not overdue)
        {
          status: 'TODO',
          originalPlannedDate: '2026-02-20',
          currentPlannedDate: '2026-02-20',
        },
      ],
    });

    expect(report.overdueCount).toBe(1);
    // Out of 2 completed tasks, 1 was on-time = 50.0%
    expect(report.onTimeCompletionRate).toBe(50.0);
  });
});
