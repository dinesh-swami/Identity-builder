import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getLocalCalendarDate } from '@/lib/domain/dateUtils';
import { DailyClient } from './DailyClient';
import { startOfDay, addDays, parseISO } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function DailyPage({
  searchParams,
}: {
  searchParams?: { date?: string; milestoneId?: string };
}) {
  const user = await requireAuth();

  const timezone = user.settings.timezone;
  const currentDateStr = searchParams?.date || getLocalCalendarDate(new Date(), timezone);
  const targetDate = parseISO(currentDateStr);
  const startOfTarget = startOfDay(targetDate);
  const endOfTarget = addDays(startOfTarget, 1);

  const [tasks, goals, weeklyMilestones, dailyReview, scheduleLog] = await Promise.all([
    prisma.task.findMany({
      where: {
        userId: user.id,
        assignedDate: {
          gte: startOfTarget,
          lt: endOfTarget,
        },
        ...(searchParams?.milestoneId ? { milestoneId: searchParams.milestoneId } : {}),
      },
      include: {
        milestone: { select: { id: true, title: true } },
        goal: { select: { id: true, title: true } },
        history: { orderBy: { recordedAt: 'desc' } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    }),

    prisma.goal.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
    }),

    prisma.milestone.findMany({
      where: {
        goal: { userId: user.id },
        type: 'WEEKLY',
      },
      include: {
        goal: { select: { id: true, title: true } },
      },
      orderBy: { originalStartDate: 'asc' },
    }),

    prisma.dailyReview.findUnique({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: currentDateStr,
        },
      },
    }),

    prisma.scheduleLog.findUnique({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: currentDateStr,
        },
      },
    }),
  ]);

  const mappedWeekly = weeklyMilestones.map((w) => ({
    id: w.id,
    title: w.title,
    goalTitle: w.goal.title,
  }));

  const mappedTasks = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    estimatedMinutes: t.estimatedMinutes,
    actualMinutes: t.actualMinutes,
    originalPlannedDate: t.originalPlannedDate.toISOString(),
    currentPlannedDate: t.currentPlannedDate.toISOString(),
    delayReason: t.delayReason,
    milestone: t.milestone,
    goal: t.goal,
    history: t.history,
  }));

  return (
    <DailyClient
      tasks={mappedTasks}
      goals={goals}
      weeklyMilestones={mappedWeekly}
      currentDateStr={currentDateStr}
      dailyReview={dailyReview}
      scheduleLog={scheduleLog}
      userSettings={user.settings}
    />
  );
}
