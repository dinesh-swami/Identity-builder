import { prisma } from '../prisma';
import { getCurrentUser } from '../auth';
import { getLocalCalendarDate } from '../domain/dateUtils';
import { computeGoalProgress, computeMonthlyMilestoneProgress, computeWeeklyMilestoneProgress } from '../domain/progress';
import { calculateScheduleHealth } from '../domain/scheduleHealth';
import { evaluateSessionState } from '../domain/focusTimer';
import { startOfDay } from 'date-fns';

export async function getDashboardData() {
  const user = await getCurrentUser();
  if (!user) return null;

  const timezone = user.settings.timezone;
  const todayDateStr = getLocalCalendarDate(new Date(), timezone);
  const startOfToday = startOfDay(new Date());

  // Run queries in parallel
  const [
    todaySessions,
    activeSessionRaw,
    todayAffirmation,
    streakRecord,
    todayTasks,
    overdueTasks,
    goals,
  ] = await Promise.all([
    // Today's focus sessions
    prisma.focusSession.findMany({
      where: {
        userId: user.id,
        calendarDate: todayDateStr,
      },
      include: {
        task: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    }),

    // Currently active or on-break session
    prisma.focusSession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      include: {
        task: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    }),

    // Today's affirmation
    prisma.affirmation.findUnique({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: todayDateStr,
        },
      },
    }),

    // Streak record
    prisma.streakRecord.findUnique({
      where: { userId: user.id },
    }),

    // Today's tasks
    prisma.task.findMany({
      where: {
        userId: user.id,
        assignedDate: {
          gte: startOfToday,
          lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
        },
      },
      include: {
        milestone: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),

    // Overdue incomplete tasks
    prisma.task.findMany({
      where: {
        userId: user.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        currentPlannedDate: { lt: startOfToday },
      },
      include: {
        goal: { select: { id: true, title: true } },
      },
      orderBy: { currentPlannedDate: 'asc' },
      take: 10,
    }),

    // Goals with milestones and tasks for rollup calculations
    prisma.goal.findMany({
      where: { userId: user.id },
      include: {
        milestones: {
          include: {
            tasks: true,
            children: {
              include: {
                tasks: true,
              },
            },
          },
        },
        tasks: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
  ]);

  // Focus metrics calculation
  const targetMinutes = user.settings.dailyTargetMinutes;
  const completedMinutes = todaySessions
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.creditedMinutes, 0);

  const completedBlocksCount = todaySessions.filter((s) => s.status === 'COMPLETED').length;
  const interruptedBlocksCount = todaySessions.filter(
    (s) => s.status === 'RESET' || s.status === 'ABANDONED'
  ).length;

  const remainingMinutes = Math.max(0, targetMinutes - completedMinutes);
  const targetProgressPercent =
    targetMinutes > 0 ? Math.min(100, Math.round((completedMinutes / targetMinutes) * 1000) / 10) : 0;

  // Active session evaluation
  let activeSessionEvaluation = null;
  if (activeSessionRaw) {
    activeSessionEvaluation = evaluateSessionState(activeSessionRaw, new Date());
  }

  // Calculate hierarchical progress and health for goals
  const calculatedGoals = goals.map((goal) => {
    // Group milestones by monthly and weekly
    const monthlyMilestones = goal.milestones
      .filter((m) => m.type === 'MONTHLY')
      .map((m) => {
        const weeklyChildren = goal.milestones
          .filter((w) => w.parentId === m.id)
          .map((w) => ({
            id: w.id,
            status: w.status,
            weight: w.weight,
            tasks: w.tasks.map((t) => ({ id: t.id, status: t.status, weight: t.weight })),
          }));

        return {
          id: m.id,
          status: m.status,
          weight: m.weight,
          weeklyMilestones: weeklyChildren,
        };
      });

    const progressResult = computeGoalProgress(monthlyMilestones);

    const health = calculateScheduleHealth({
      startDate: goal.startDate,
      originalTargetDate: goal.originalTargetDate,
      currentTargetDate: goal.currentTargetDate,
      completedAt: goal.completedAt,
      actualProgress: progressResult.progressPercentage,
      tasks: goal.tasks.map((t) => ({
        status: t.status,
        originalPlannedDate: t.originalPlannedDate,
        currentPlannedDate: t.currentPlannedDate,
        completedAt: t.completedAt,
      })),
    });

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      status: goal.status,
      startDate: goal.startDate,
      originalTargetDate: goal.originalTargetDate,
      currentTargetDate: goal.currentTargetDate,
      progress: progressResult.progressPercentage,
      health,
      monthlyCount: monthlyMilestones.length,
      tasksCount: goal.tasks.length,
    };
  });

  return {
    user,
    todayDateStr,
    focusMetrics: {
      targetMinutes,
      completedMinutes,
      remainingMinutes,
      targetProgressPercent,
      completedBlocksCount,
      interruptedBlocksCount,
      targetHours: Math.round((targetMinutes / 60) * 10) / 10,
      completedHours: Math.round((completedMinutes / 60) * 10) / 10,
      remainingHours: Math.round((remainingMinutes / 60) * 10) / 10,
    },
    activeSession: activeSessionRaw,
    activeSessionEvaluation,
    recentSessions: todaySessions.slice(0, 5),
    affirmationStatus: {
      completedToday: !!todayAffirmation,
      todayAffirmation,
      currentStreak: streakRecord?.currentStreak || 0,
      longestStreak: streakRecord?.longestStreak || 0,
      totalDaysCompleted: streakRecord?.totalDaysCompleted || 0,
    },
    todayTasks: {
      all: todayTasks,
      completed: todayTasks.filter((t) => t.status === 'COMPLETED'),
      inProgress: todayTasks.filter((t) => t.status === 'IN_PROGRESS'),
      todo: todayTasks.filter((t) => t.status === 'TODO'),
      totalCount: todayTasks.length,
      completedCount: todayTasks.filter((t) => t.status === 'COMPLETED').length,
    },
    overdueTasks,
    goals: calculatedGoals,
  };
}
