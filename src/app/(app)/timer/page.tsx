import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getLocalCalendarDate } from '@/lib/domain/dateUtils';
import { evaluateSessionState } from '@/lib/domain/focusTimer';
import { TimerClient } from './TimerClient';
import { startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function TimerPage({
  searchParams,
}: {
  searchParams?: { taskId?: string };
}) {
  const user = await requireAuth();

  const timezone = user.settings.timezone;
  const todayDateStr = getLocalCalendarDate(new Date(), timezone);
  const startOfToday = startOfDay(new Date());

  const [activeSessionRaw, todaySessions, tasks] = await Promise.all([
    prisma.focusSession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    }),

    prisma.focusSession.findMany({
      where: {
        userId: user.id,
        calendarDate: todayDateStr,
      },
      include: {
        task: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    }),

    prisma.task.findMany({
      where: {
        userId: user.id,
        assignedDate: {
          gte: startOfToday,
        },
        status: { not: 'COMPLETED' },
      },
      select: { id: true, title: true },
    }),
  ]);

  let evaluation = null;
  if (activeSessionRaw) {
    evaluation = evaluateSessionState(activeSessionRaw, new Date());
  }

  return (
    <TimerClient
      initialSession={activeSessionRaw}
      initialEvaluation={evaluation}
      todaySessions={todaySessions}
      tasks={tasks}
      dailyTargetMinutes={user.settings.dailyTargetMinutes}
      initialTaskId={searchParams?.taskId}
    />
  );
}
