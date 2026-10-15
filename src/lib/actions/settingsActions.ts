'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { userSettingsSchema } from '../validations';
import { z } from 'zod';

export async function updateUserSettingsAction(raw: z.infer<typeof userSettingsSchema>) {
  try {
    const user = await requireAuth();
    const data = userSettingsSchema.parse(raw);

    const updated = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        dailyTargetMinutes: data.dailyTargetMinutes,
        timezone: data.timezone,
        targetSleepTime: data.targetSleepTime,
        targetWakeTime: data.targetWakeTime,
      },
      update: {
        dailyTargetMinutes: data.dailyTargetMinutes,
        timezone: data.timezone,
        targetSleepTime: data.targetSleepTime,
        targetWakeTime: data.targetWakeTime,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/timer');
    return { success: true, settings: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update settings.' };
  }
}
