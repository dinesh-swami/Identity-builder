'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { hashPassword, verifyPassword, setSessionCookie, clearSessionCookie } from '../auth';
import { loginSchema, registerSchema } from '../validations';

export async function registerAction(data: { email: string; password: string; name?: string }) {
  try {
    const validated = registerSchema.parse(data);

    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, error: 'A user with this email address already exists.' };
    }

    const passwordHash = await hashPassword(validated.password);

    const user = await prisma.user.create({
      data: {
        email: validated.email.toLowerCase(),
        passwordHash,
        name: validated.name || null,
        settings: {
          create: {
            dailyTargetMinutes: 480, // 8 hours
            timezone: 'Asia/Kolkata',
            targetSleepTime: '23:00',
            targetWakeTime: '07:00',
          },
        },
        streakRecord: {
          create: {
            currentStreak: 0,
            longestStreak: 0,
            totalDaysCompleted: 0,
          },
        },
      },
    });

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Registration error:', err);
    return { success: false, error: err.message || 'Failed to create account.' };
  }
}

export async function loginAction(data: { email: string; password: string }) {
  try {
    const validated = loginSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const isValid = await verifyPassword(validated.password, user.passwordHash);
    if (!isValid) {
      return { success: false, error: 'Invalid email or password.' };
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    return { success: true };
  } catch (err: any) {
    console.error('Login error:', err);
    return { success: false, error: err.message || 'Login failed.' };
  }
}

export async function logoutAction() {
  await clearSessionCookie();
  revalidatePath('/');
  return { success: true };
}
