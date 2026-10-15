import { differenceInCalendarDays, parseISO, isAfter, startOfDay } from 'date-fns';

export type ForecastStatus = 'ON_TRACK' | 'AT_RISK' | 'BEHIND_SCHEDULE' | 'INSUFFICIENT_DATA';

export interface ScheduleHealthInput {
  startDate: Date | string;
  originalTargetDate: Date | string;
  currentTargetDate: Date | string;
  completedAt?: Date | string | null;
  actualProgress: number; // 0 to 100
  cutoffDate?: Date | string; // Defaults to now
  tasks?: Array<{
    status: string;
    originalPlannedDate: Date | string;
    currentPlannedDate: Date | string;
    completedAt?: Date | string | null;
  }>;
}

export interface ScheduleHealthReport {
  actualProgress: number;
  plannedProgress: number;
  progressGap: number;
  deadlineDelayDays: number;
  overdueCount: number;
  onTimeCompletionRate: number;
  forecastStatus: ForecastStatus;
  isCompleted: boolean;
}

export function toDate(d: Date | string): Date {
  return typeof d === 'string' ? parseISO(d) : d;
}

/**
 * Calculates schedule health and forecasting without confusing elapsed time with task completion.
 */
export function calculateScheduleHealth(input: ScheduleHealthInput): ScheduleHealthReport {
  const start = startOfDay(toDate(input.startDate));
  const origTarget = startOfDay(toDate(input.originalTargetDate));
  const currTarget = startOfDay(toDate(input.currentTargetDate));
  const cutoff = startOfDay(input.cutoffDate ? toDate(input.cutoffDate) : new Date());
  const completedDate = input.completedAt ? startOfDay(toDate(input.completedAt)) : null;

  // 1. Planned progress based on linear timeline baseline
  const totalDays = differenceInCalendarDays(origTarget, start);
  let plannedProgress = 0;

  if (totalDays <= 0) {
    plannedProgress = 100;
  } else if (differenceInCalendarDays(cutoff, start) <= 0) {
    plannedProgress = 0;
  } else if (differenceInCalendarDays(cutoff, origTarget) >= 0) {
    plannedProgress = 100;
  } else {
    const elapsedDays = differenceInCalendarDays(cutoff, start);
    plannedProgress = Math.round((elapsedDays / totalDays) * 1000) / 10;
  }

  // 2. Progress gap: actual - planned
  const actualProgress = Math.round(input.actualProgress * 10) / 10;
  const progressGap = Math.round((actualProgress - plannedProgress) * 10) / 10;

  // 3. Deadline delay in days
  // If completed: delay between original deadline and completion date
  // If not completed: delay between original deadline and current target deadline
  let deadlineDelayDays = 0;
  if (completedDate) {
    const diff = differenceInCalendarDays(completedDate, origTarget);
    deadlineDelayDays = Math.max(0, diff);
  } else {
    const diff = differenceInCalendarDays(currTarget, origTarget);
    deadlineDelayDays = Math.max(0, diff);
  }

  // 4. Overdue count and on-time completion rate from tasks
  let overdueCount = 0;
  let dueEligibleTasks = 0;
  let onTimeCompletedTasks = 0;

  if (input.tasks && input.tasks.length > 0) {
    for (const task of input.tasks) {
      if (task.status === 'CANCELLED') continue;

      const taskPlannedDate = startOfDay(toDate(task.currentPlannedDate));
      const taskOrigDate = startOfDay(toDate(task.originalPlannedDate));
      const taskCompleted = task.completedAt ? startOfDay(toDate(task.completedAt)) : null;

      // Incomplete and past current planned date
      if (task.status !== 'COMPLETED') {
        if (isAfter(cutoff, taskPlannedDate)) {
          overdueCount++;
        }
      } else if (taskCompleted) {
        // Task completed
        dueEligibleTasks++;
        // On-time if completed on or before original deadline
        if (!isAfter(taskCompleted, taskOrigDate)) {
          onTimeCompletedTasks++;
        }
      }
    }
  }

  const onTimeCompletionRate =
    dueEligibleTasks > 0 ? Math.round((onTimeCompletedTasks / dueEligibleTasks) * 1000) / 10 : 100;

  // 5. Forecast status
  let forecastStatus: ForecastStatus = 'ON_TRACK';
  const isPastOverallDeadline = isAfter(cutoff, currTarget) && actualProgress < 100;

  if (totalDays <= 0 && (!input.tasks || input.tasks.length === 0)) {
    forecastStatus = 'INSUFFICIENT_DATA';
  } else if (isPastOverallDeadline || overdueCount >= 3 || progressGap < -20) {
    forecastStatus = 'BEHIND_SCHEDULE';
  } else if (overdueCount > 0 || progressGap < -5 || deadlineDelayDays > 0) {
    forecastStatus = 'AT_RISK';
  } else {
    forecastStatus = 'ON_TRACK';
  }

  return {
    actualProgress,
    plannedProgress,
    progressGap,
    deadlineDelayDays,
    overdueCount,
    onTimeCompletionRate,
    forecastStatus,
    isCompleted: !!completedDate || actualProgress >= 100,
  };
}
