'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { validateAffirmation, calculateNewStreak } from '../domain/affirmation';
import { getLocalCalendarDate } from '../domain/dateUtils';

export async function submitAffirmationAction(text: string) {
  try {
    const user = await requireAuth();

    // 1. Validate affirmation per strict rules
    const validation = validateAffirmation(text);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errorMessages.join(' '),
        validation,
      };
    }

    const todayDate = getLocalCalendarDate(new Date(), user.settings.timezone);

    // 2. Fetch or create streak record
    const streakRecord = await prisma.streakRecord.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
        totalDaysCompleted: 0,
      },
      update: {},
    });

    // 3. Compute streak changes
    const streakResult = calculateNewStreak({
      lastCompletedDate: streakRecord.lastCompletedDate,
      currentStreak: streakRecord.currentStreak,
      longestStreak: streakRecord.longestStreak,
      totalDaysCompleted: streakRecord.totalDaysCompleted,
      newCompletionDate: todayDate,
    });

    // 4. Atomic transaction to save affirmation and update streak record
    const result = await prisma.$transaction(async (tx) => {
      const affirmation = await tx.affirmation.upsert({
        where: {
          userId_calendarDate: {
            userId: user.id,
            calendarDate: todayDate,
          },
        },
        create: {
          userId: user.id,
          text: text.trim(),
          wordCount: validation.wordCount,
          charCount: validation.charCount,
          calendarDate: todayDate,
        },
        update: {
          text: text.trim(),
          wordCount: validation.wordCount,
          charCount: validation.charCount,
        },
      });

      const updatedStreak = await tx.streakRecord.update({
        where: { userId: user.id },
        data: {
          currentStreak: streakResult.currentStreak,
          longestStreak: streakResult.longestStreak,
          totalDaysCompleted: streakResult.totalDaysCompleted,
          lastCompletedDate: todayDate,
        },
      });

      return { affirmation, streakRecord: updatedStreak };
    });

    revalidatePath('/affirmations');
    revalidatePath('/dashboard');
    return {
      success: true,
      affirmation: result.affirmation,
      streakRecord: result.streakRecord,
      streakResult,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit affirmation.' };
  }
}

export async function getAffirmationStatusAction() {
  try {
    const user = await requireAuth();
    const todayDate = getLocalCalendarDate(new Date(), user.settings.timezone);

    const [todayAffirmation, streakRecord, recentHistory] = await Promise.all([
      prisma.affirmation.findUnique({
        where: {
          userId_calendarDate: {
            userId: user.id,
            calendarDate: todayDate,
          },
        },
      }),
      prisma.streakRecord.findUnique({
        where: { userId: user.id },
      }),
      prisma.affirmation.findMany({
        where: { userId: user.id },
        orderBy: { calendarDate: 'desc' },
        take: 30,
      }),
    ]);

    return {
      success: true,
      todayCompleted: !!todayAffirmation,
      todayAffirmation,
      streakRecord: streakRecord || {
        currentStreak: 0,
        longestStreak: 0,
        totalDaysCompleted: 0,
        lastCompletedDate: null,
      },
      recentHistory,
      todayDate,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch affirmation status.' };
  }
}
