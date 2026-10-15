import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getLocalCalendarDate } from '@/lib/domain/dateUtils';
import { AffirmationsClient } from './AffirmationsClient';

export const dynamic = 'force-dynamic';

export default async function AffirmationsPage() {
  const user = await requireAuth();

  const timezone = user.settings.timezone;
  const todayDateStr = getLocalCalendarDate(new Date(), timezone);

  const [todayAffirmation, streakRecord, history] = await Promise.all([
    prisma.affirmation.findUnique({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: todayDateStr,
        },
      },
    }),
    prisma.streakRecord.findUnique({
      where: { userId: user.id },
    }),
    prisma.affirmation.findMany({
      where: { userId: user.id },
      orderBy: { calendarDate: 'desc' },
      take: 50,
    }),
  ]);

  return (
    <AffirmationsClient
      todayAffirmation={todayAffirmation}
      streakRecord={streakRecord}
      history={history}
      todayDateStr={todayDateStr}
    />
  );
}
