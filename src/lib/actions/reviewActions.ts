'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { dailyReviewSchema, scheduleLogSchema } from '../validations';
import { z } from 'zod';

export async function saveDailyReviewAction(raw: z.infer<typeof dailyReviewSchema>) {
  try {
    const user = await requireAuth();
    const data = dailyReviewSchema.parse(raw);

    const review = await prisma.dailyReview.upsert({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: data.calendarDate,
        },
      },
      create: {
        userId: user.id,
        calendarDate: data.calendarDate,
        completedSummary: data.completedSummary,
        failedSummary: data.failedSummary || null,
        failureReason: data.failureReason || null,
        carryForwardPlan: data.carryForwardPlan || null,
        tomorrowChanges: data.tomorrowChanges || null,
        score: data.score,
      },
      update: {
        completedSummary: data.completedSummary,
        failedSummary: data.failedSummary || null,
        failureReason: data.failureReason || null,
        carryForwardPlan: data.carryForwardPlan || null,
        tomorrowChanges: data.tomorrowChanges || null,
        score: data.score,
      },
    });

    revalidatePath('/daily');
    revalidatePath('/reports');
    revalidatePath('/dashboard');
    return { success: true, review };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save daily review.' };
  }
}

/**
 * Calculates overnight sleep duration in minutes correctly.
 * Example: sleep 23:00, wake 07:00 -> 8 hours (480 mins), NOT -16 hours.
 */
function calculateOvernightSleepMinutes(sleepTime: string, wakeTime: string): number {
  const [sleepH, sleepM] = sleepTime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);

  const sleepMinutesFromMidnight = sleepH * 60 + sleepM;
  const wakeMinutesFromMidnight = wakeH * 60 + wakeM;

  if (wakeMinutesFromMidnight >= sleepMinutesFromMidnight) {
    return wakeMinutesFromMidnight - sleepMinutesFromMidnight;
  }
  // Overnight: from sleep until midnight (1440 - sleep) + wake minutes
  return 1440 - sleepMinutesFromMidnight + wakeMinutesFromMidnight;
}

export async function saveScheduleLogAction(raw: z.infer<typeof scheduleLogSchema>) {
  try {
    const user = await requireAuth();
    const data = scheduleLogSchema.parse(raw);

    const actualDuration = calculateOvernightSleepMinutes(data.actualSleepTime, data.actualWakeTime);
    const targetDuration = calculateOvernightSleepMinutes(data.targetSleepTime, data.targetWakeTime);
    const deviationMinutes = actualDuration - targetDuration;

    // Met target if sleep time is within 30 mins and wake time is within 30 mins
    const [actWakeH, actWakeM] = data.actualWakeTime.split(':').map(Number);
    const [tgtWakeH, tgtWakeM] = data.targetWakeTime.split(':').map(Number);
    const wakeDiff = Math.abs(actWakeH * 60 + actWakeM - (tgtWakeH * 60 + tgtWakeM));
    const metTarget = wakeDiff <= 30;

    const log = await prisma.scheduleLog.upsert({
      where: {
        userId_calendarDate: {
          userId: user.id,
          calendarDate: data.calendarDate,
        },
      },
      create: {
        userId: user.id,
        calendarDate: data.calendarDate,
        targetSleepTime: data.targetSleepTime,
        targetWakeTime: data.targetWakeTime,
        actualSleepTime: data.actualSleepTime,
        actualWakeTime: data.actualWakeTime,
        sleepDurationMinutes: actualDuration,
        deviationMinutes,
        metTarget,
        notes: data.notes || null,
      },
      update: {
        targetSleepTime: data.targetSleepTime,
        targetWakeTime: data.targetWakeTime,
        actualSleepTime: data.actualSleepTime,
        actualWakeTime: data.actualWakeTime,
        sleepDurationMinutes: actualDuration,
        deviationMinutes,
        metTarget,
        notes: data.notes || null,
      },
    });

    revalidatePath('/daily');
    revalidatePath('/reports');
    return { success: true, log };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save schedule log.' };
  }
}
