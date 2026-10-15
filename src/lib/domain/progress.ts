import { TaskStatus, MilestoneStatus, GoalStatus } from '@prisma/client';

export interface ProgressResult {
  progressPercentage: number;
  totalEligibleWeight: number;
  completedWeight: number;
  eligibleCount: number;
  completedCount: number;
  cancelledCount: number;
  isUnplannedOrEmpty: boolean;
}

/**
 * Returns completion fraction for a task.
 * Per spec: Binary completion model for MVP (TODO=0, IN_PROGRESS=0, COMPLETED=1, CANCELLED=excluded).
 */
export function getTaskCompletionFraction(status: TaskStatus): number | null {
  switch (status) {
    case 'COMPLETED':
      return 1.0;
    case 'TODO':
    case 'IN_PROGRESS':
      return 0.0;
    case 'CANCELLED':
      return null; // Excluded from denominator
    default:
      return 0.0;
  }
}

/**
 * Returns completion fraction for a milestone based on its explicit status or computed progress.
 */
export function getMilestoneCompletionFraction(status: MilestoneStatus, calculatedProgress?: number): number | null {
  if (status === 'CANCELLED') return null;
  if (status === 'COMPLETED') return 1.0;
  if (calculatedProgress !== undefined) {
    return Math.max(0, Math.min(1.0, calculatedProgress / 100));
  }
  return 0.0;
}

/**
 * Generic weighted progress calculator over a set of items with weight and completion fraction.
 * Excludes cancelled items from denominator.
 * Avoids division by zero when no eligible items exist.
 */
export function calculateWeightedProgress(
  items: Array<{ weight?: number; completionFraction: number | null }>
): ProgressResult {
  let totalEligibleWeight = 0;
  let completedWeight = 0;
  let eligibleCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;

  for (const item of items) {
    if (item.completionFraction === null) {
      cancelledCount++;
      continue;
    }

    const weight = typeof item.weight === 'number' && item.weight > 0 ? item.weight : 1.0;
    totalEligibleWeight += weight;
    completedWeight += weight * item.completionFraction;
    eligibleCount++;
    if (item.completionFraction === 1.0) {
      completedCount++;
    }
  }

  if (totalEligibleWeight === 0 || eligibleCount === 0) {
    return {
      progressPercentage: 0,
      totalEligibleWeight: 0,
      completedWeight: 0,
      eligibleCount: 0,
      completedCount: 0,
      cancelledCount,
      isUnplannedOrEmpty: true,
    };
  }

  const rawPercent = (completedWeight / totalEligibleWeight) * 100;
  // Round to 1 decimal place for clean deterministic presentation
  const progressPercentage = Math.round(rawPercent * 10) / 10;

  return {
    progressPercentage,
    totalEligibleWeight,
    completedWeight,
    eligibleCount,
    completedCount,
    cancelledCount,
    isUnplannedOrEmpty: false,
  };
}

export interface TaskItem {
  id: string;
  status: TaskStatus;
  weight?: number;
}

export interface WeeklyMilestoneItem {
  id: string;
  status: MilestoneStatus;
  weight?: number;
  tasks?: TaskItem[];
}

export interface MonthlyMilestoneItem {
  id: string;
  status: MilestoneStatus;
  weight?: number;
  weeklyMilestones?: WeeklyMilestoneItem[];
}

export interface GoalItem {
  id: string;
  status: GoalStatus;
  monthlyMilestones?: MonthlyMilestoneItem[];
}

/**
 * Computes progress of a weekly milestone from its child tasks.
 */
export function computeWeeklyMilestoneProgress(tasks: TaskItem[] = []): ProgressResult {
  const items = tasks.map((t) => ({
    weight: t.weight,
    completionFraction: getTaskCompletionFraction(t.status),
  }));
  return calculateWeightedProgress(items);
}

/**
 * Computes progress of a monthly milestone from its weekly milestones.
 * Each weekly milestone contributes its own computed progress fraction unless explicitly cancelled or marked completed.
 */
export function computeMonthlyMilestoneProgress(weeklyMilestones: WeeklyMilestoneItem[] = []): ProgressResult {
  const items = weeklyMilestones.map((w) => {
    if (w.status === 'CANCELLED') {
      return { weight: w.weight, completionFraction: null };
    }
    if (w.status === 'COMPLETED') {
      return { weight: w.weight, completionFraction: 1.0 };
    }
    // Rollup from tasks if available
    const weekProgress = w.tasks ? computeWeeklyMilestoneProgress(w.tasks).progressPercentage : 0;
    return {
      weight: w.weight,
      completionFraction: getMilestoneCompletionFraction(w.status, weekProgress),
    };
  });
  return calculateWeightedProgress(items);
}

/**
 * Computes overall goal progress rolling up through its monthly milestones.
 */
export function computeGoalProgress(monthlyMilestones: MonthlyMilestoneItem[] = []): ProgressResult {
  const items = monthlyMilestones.map((m) => {
    if (m.status === 'CANCELLED') {
      return { weight: m.weight, completionFraction: null };
    }
    if (m.status === 'COMPLETED') {
      return { weight: m.weight, completionFraction: 1.0 };
    }
    const monthProgress = m.weeklyMilestones
      ? computeMonthlyMilestoneProgress(m.weeklyMilestones).progressPercentage
      : 0;
    return {
      weight: m.weight,
      completionFraction: getMilestoneCompletionFraction(m.status, monthProgress),
    };
  });
  return calculateWeightedProgress(items);
}
