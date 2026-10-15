'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { evaluateSessionState, MAX_EMERGENCY_BREAK_SECONDS } from '../domain/focusTimer';
import { getLocalCalendarDate } from '../domain/dateUtils';
import { focusSessionStartSchema } from '../validations';
import { z } from 'zod';

export async function getActiveFocusSessionAction() {
  try {
    const user = await requireAuth();

    const activeSession = await prisma.focusSession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
      include: {
        goal: { select: { id: true, title: true } },
        milestone: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (!activeSession) {
      return { success: true, session: null, evaluation: null };
    }

    const now = new Date();
    const evaluation = evaluateSessionState(activeSession, now);

    // If evaluated to RESET (break exceeded) or COMPLETED (work time reached), persist authoritative state
    if (evaluation.status === 'RESET' && activeSession.status !== 'RESET') {
      const updated = await prisma.focusSession.update({
        where: { id: activeSession.id },
        data: {
          status: 'RESET',
          creditedMinutes: 0,
          resetReason: evaluation.resetReason,
        },
      });
      revalidatePath('/timer');
      revalidatePath('/dashboard');
      return { success: true, session: updated, evaluation };
    }

    if (evaluation.status === 'COMPLETED' && activeSession.status !== 'COMPLETED') {
      const updated = await prisma.$transaction(async (tx) => {
        const s = await tx.focusSession.update({
          where: { id: activeSession.id },
          data: {
            status: 'COMPLETED',
            creditedMinutes: activeSession.targetDurationMinutes,
            completedAt: now,
          },
        });

        // Credit actual minutes to linked task if present
        if (activeSession.taskId) {
          await tx.task.update({
            where: { id: activeSession.taskId },
            data: {
              actualMinutes: { increment: activeSession.targetDurationMinutes },
            },
          });
        }
        return s;
      });

      revalidatePath('/timer');
      revalidatePath('/dashboard');
      return { success: true, session: updated, evaluation };
    }

    return { success: true, session: activeSession, evaluation };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch focus session.' };
  }
}

export async function startFocusSessionAction(raw: z.input<typeof focusSessionStartSchema>) {
  try {
    const user = await requireAuth();
    const data = focusSessionStartSchema.parse(raw);

    // Prevent multiple concurrent active sessions
    const existing = await prisma.focusSession.findFirst({
      where: {
        userId: user.id,
        status: { in: ['ACTIVE', 'ON_BREAK'] },
      },
    });

    if (existing) {
      // Check if existing session has naturally expired/completed/reset
      const evalExisting = evaluateSessionState(existing, new Date());
      if (evalExisting.status === 'ACTIVE' || evalExisting.status === 'ON_BREAK') {
        return {
          success: false,
          error: 'An active focus block is already in progress. Please complete or reset it first.',
        };
      }
      // If it expired, resolve it
      await prisma.focusSession.update({
        where: { id: existing.id },
        data: {
          status: evalExisting.status,
          creditedMinutes: evalExisting.creditedMinutes,
          resetReason: evalExisting.resetReason,
          completedAt: evalExisting.status === 'COMPLETED' ? new Date() : null,
        },
      });
    }

    const now = new Date();
    const calendarDate = getLocalCalendarDate(now, user.settings.timezone);

    const session = await prisma.focusSession.create({
      data: {
        userId: user.id,
        targetDurationMinutes: data.targetDurationMinutes,
        status: 'ACTIVE',
        startedAt: now,
        calendarDate,
        goalId: data.goalId || null,
        milestoneId: data.milestoneId || null,
        taskId: data.taskId || null,
        emergencyBreakUsed: false,
        breakDurationSeconds: 0,
        creditedMinutes: 0,
      },
    });

    revalidatePath('/timer');
    revalidatePath('/dashboard');
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to start focus session.' };
  }
}

export async function takeEmergencyBreakAction(sessionId: string) {
  try {
    const user = await requireAuth();

    const session = await prisma.focusSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session || session.status !== 'ACTIVE') {
      return { success: false, error: 'Session is not currently active.' };
    }

    if (session.emergencyBreakUsed) {
      return {
        success: false,
        error: 'Only one emergency break is permitted per focus block.',
      };
    }

    const updated = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'ON_BREAK',
        breakStartedAt: new Date(),
        emergencyBreakUsed: true,
      },
    });

    revalidatePath('/timer');
    revalidatePath('/dashboard');
    return { success: true, session: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to take break.' };
  }
}

export async function resumeEmergencyBreakAction(sessionId: string) {
  try {
    const user = await requireAuth();

    const session = await prisma.focusSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session || session.status !== 'ON_BREAK' || !session.breakStartedAt) {
      return { success: false, error: 'Session is not currently on break.' };
    }

    const now = new Date();
    const breakElapsedSeconds = Math.floor(
      (now.getTime() - new Date(session.breakStartedAt).getTime()) / 1000
    );

    // 5-minute emergency break rule check
    if (breakElapsedSeconds > MAX_EMERGENCY_BREAK_SECONDS) {
      // Invalidate and reset block!
      const resetSession = await prisma.focusSession.update({
        where: { id: sessionId },
        data: {
          status: 'RESET',
          creditedMinutes: 0, // Incomplete duration is NEVER credited!
          resetReason: 'Exceeded 5-minute emergency break allowance',
        },
      });

      revalidatePath('/timer');
      revalidatePath('/dashboard');
      return {
        success: false,
        error: 'Your break exceeded the strict 5-minute allowance. The block has been invalidated and reset to zero.',
        session: resetSession,
      };
    }

    // Resumed within 5 minutes: break duration accumulated, session resumed to ACTIVE
    const updated = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        breakStartedAt: null,
        breakDurationSeconds: { increment: breakElapsedSeconds },
      },
    });

    revalidatePath('/timer');
    revalidatePath('/dashboard');
    return { success: true, session: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to resume from break.' };
  }
}

export async function completeFocusSessionAction(sessionId: string) {
  try {
    const user = await requireAuth();

    const session = await prisma.focusSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return { success: false, error: 'Focus session not found.' };
    }

    if (session.status === 'COMPLETED') {
      return { success: true, session };
    }

    const now = new Date();
    const evaluation = evaluateSessionState(session, now);

    if (evaluation.status === 'RESET') {
      await prisma.focusSession.update({
        where: { id: sessionId },
        data: {
          status: 'RESET',
          creditedMinutes: 0,
          resetReason: evaluation.resetReason,
        },
      });
      return {
        success: false,
        error: 'Session break exceeded 5 minutes and was reset. No work credited.',
      };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const s = await tx.focusSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          creditedMinutes: session.targetDurationMinutes,
        },
      });

      if (session.taskId) {
        await tx.task.update({
          where: { id: session.taskId },
          data: {
            actualMinutes: { increment: session.targetDurationMinutes },
          },
        });
      }

      return s;
    });

    revalidatePath('/timer');
    revalidatePath('/dashboard');
    return { success: true, session: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to complete session.' };
  }
}

export async function abandonFocusSessionAction(sessionId: string, reason?: string) {
  try {
    const user = await requireAuth();

    const session = await prisma.focusSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });

    if (!session) {
      return { success: false, error: 'Focus session not found.' };
    }

    const updated = await prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        status: 'ABANDONED',
        creditedMinutes: 0, // Never credited
        resetReason: reason || 'Manually abandoned by user',
      },
    });

    revalidatePath('/timer');
    revalidatePath('/dashboard');
    return { success: true, session: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to abandon session.' };
  }
}
