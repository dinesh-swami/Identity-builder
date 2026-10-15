import { prisma } from '../prisma';
import { getCurrentUser } from '../auth';
import { getLocalCalendarDate } from '../domain/dateUtils';
import { computeGoalProgress, computeMonthlyMilestoneProgress, computeWeeklyMilestoneProgress } from '../domain/progress';
import { calculateScheduleHealth } from '../domain/scheduleHealth';
import { startOfDay, subDays, addDays, format, parseISO } from 'date-fns';

export async function getReportsData(selectedDateStr?: string) {
  const user = await getCurrentUser();
  if (!user) return null;

  const timezone = user.settings.timezone;
  const targetDateStr = selectedDateStr || getLocalCalendarDate(new Date(), timezone);
  const targetDate = parseISO(targetDateStr);
  const startOfTarget = startOfDay(targetDate);
  const endOfTarget = addDays(startOfTarget, 1);

  // 1. Daily Report Data
  const [
    dailySessions,
    dailyTasks,
    dailyAffirmation,
    streakRecord,
    dailyReview,
    dailyScheduleLog,
  ] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId: user.id, calendarDate: targetDateStr },
      include: {
        task: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        assignedDate: { gte: startOfTarget, lt: endOfTarget },
      },
      include: {
        goal: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true } },
        history: true,
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),
    prisma.affirmation.findUnique({
      where: {
        userId_calendarDate: { userId: user.id, calendarDate: targetDateStr },
      },
    }),
    prisma.streakRecord.findUnique({
      where: { userId: user.id },
    }),
    prisma.dailyReview.findUnique({
      where: {
        userId_calendarDate: { userId: user.id, calendarDate: targetDateStr },
      },
    }),
    prisma.scheduleLog.findUnique({
      where: {
        userId_calendarDate: { userId: user.id, calendarDate: targetDateStr },
      },
    }),
  ]);

  const targetMinutes = user.settings.dailyTargetMinutes;
  const completedMinutes = dailySessions
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.creditedMinutes, 0);

  const completedBlocks = dailySessions.filter((s) => s.status === 'COMPLETED');
  const interruptedBlocks = dailySessions.filter(
    (s) => s.status === 'RESET' || s.status === 'ABANDONED'
  );

  const dailyReport = {
    date: targetDateStr,
    targetMinutes,
    completedMinutes,
    targetHours: Math.round((targetMinutes / 60) * 10) / 10,
    completedHours: Math.round((completedMinutes / 60) * 10) / 10,
    targetProgressPercent:
      targetMinutes > 0 ? Math.min(100, Math.round((completedMinutes / targetMinutes) * 1000) / 10) : 0,
    completedBlocksCount: completedBlocks.length,
    interruptedBlocksCount: interruptedBlocks.length,
    sessions: dailySessions,
    tasks: dailyTasks,
    plannedTasksCount: dailyTasks.length,
    completedTasksCount: dailyTasks.filter((t) => t.status === 'COMPLETED').length,
    overdueTasksCount: dailyTasks.filter((t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED').length,
    affirmation: dailyAffirmation,
    streakRecord,
    dailyReview,
    dailyScheduleLog,
  };

  // 2. Weekly Report Data (past 7 days ending on targetDate)
  const last7DaysStrings: string[] = [];
  for (let i = 6; i >= 0; i--) {
    last7DaysStrings.push(format(subDays(targetDate, i), 'yyyy-MM-dd'));
  }

  const prev7DaysStrings: string[] = [];
  for (let i = 13; i >= 7; i--) {
    prev7DaysStrings.push(format(subDays(targetDate, i), 'yyyy-MM-dd'));
  }

  const [weeklySessions, prevWeeklySessions, weeklyTasks] = await Promise.all([
    prisma.focusSession.findMany({
      where: {
        userId: user.id,
        calendarDate: { in: last7DaysStrings },
      },
    }),
    prisma.focusSession.findMany({
      where: {
        userId: user.id,
        calendarDate: { in: prev7DaysStrings },
      },
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        assignedDate: {
          gte: startOfDay(subDays(targetDate, 6)),
          lt: addDays(startOfTarget, 1),
        },
      },
    }),
  ]);

  // Aggregate daily focus hours for chart
  const weeklyDayBreakdown = last7DaysStrings.map((dayStr) => {
    const daySessions = weeklySessions.filter(
      (s) => s.calendarDate === dayStr && s.status === 'COMPLETED'
    );
    const dayMinutes = daySessions.reduce((acc, s) => acc + s.creditedMinutes, 0);
    return {
      day: dayStr,
      displayDay: format(parseISO(dayStr), 'EEE, MMM d'),
      hours: Math.round((dayMinutes / 60) * 10) / 10,
      targetHours: Math.round((targetMinutes / 60) * 10) / 10,
    };
  });

  const weeklyCompletedMinutes = weeklySessions
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.creditedMinutes, 0);

  const prevWeeklyCompletedMinutes = prevWeeklySessions
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.creditedMinutes, 0);

  const weeklyTasksTotal = weeklyTasks.filter((t) => t.status !== 'CANCELLED').length;
  const weeklyTasksCompleted = weeklyTasks.filter((t) => t.status === 'COMPLETED').length;
  const weeklyOnTimeTasks = weeklyTasks.filter(
    (t) =>
      t.status === 'COMPLETED' &&
      t.completedAt &&
      startOfDay(new Date(t.completedAt)).getTime() <= startOfDay(new Date(t.originalPlannedDate)).getTime()
  ).length;

  const weeklyReport = {
    totalHours: Math.round((weeklyCompletedMinutes / 60) * 10) / 10,
    prevWeekTotalHours: Math.round((prevWeeklyCompletedMinutes / 60) * 10) / 10,
    dailyAverageHours: Math.round((weeklyCompletedMinutes / 7 / 60) * 10) / 10,
    plannedTasksCount: weeklyTasksTotal,
    completedTasksCount: weeklyTasksCompleted,
    completionRate:
      weeklyTasksTotal > 0 ? Math.round((weeklyTasksCompleted / weeklyTasksTotal) * 1000) / 10 : 0,
    onTimeRate:
      weeklyTasksCompleted > 0 ? Math.round((weeklyOnTimeTasks / weeklyTasksCompleted) * 1000) / 10 : 100,
    dayBreakdown: weeklyDayBreakdown,
  };

  // 3. Goals and Milestones Report Data
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: {
      milestones: {
        include: {
          tasks: true,
        },
      },
      tasks: true,
      focusSessions: {
        where: { status: 'COMPLETED' },
      },
    },
  });

  const goalReports = goals.map((goal) => {
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
          title: m.title,
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

    const totalGoalFocusMinutes = goal.focusSessions.reduce((acc, s) => acc + s.creditedMinutes, 0);

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      status: goal.status,
      startDate: format(goal.startDate, 'yyyy-MM-dd'),
      originalTargetDate: format(goal.originalTargetDate, 'yyyy-MM-dd'),
      currentTargetDate: format(goal.currentTargetDate, 'yyyy-MM-dd'),
      actualProgress: progressResult.progressPercentage,
      health,
      totalFocusHours: Math.round((totalGoalFocusMinutes / 60) * 10) / 10,
      monthlyMilestones: monthlyMilestones.map((m) => ({
        id: m.id,
        title: m.title,
        status: m.status,
        progress: computeMonthlyMilestoneProgress(m.weeklyMilestones).progressPercentage,
        weeklyCount: m.weeklyMilestones.length,
      })),
      tasksCount: goal.tasks.length,
      completedTasksCount: goal.tasks.filter((t) => t.status === 'COMPLETED').length,
    };
  });

  return {
    selectedDate: targetDateStr,
    dailyReport,
    weeklyReport,
    goalReports,
  };
}
