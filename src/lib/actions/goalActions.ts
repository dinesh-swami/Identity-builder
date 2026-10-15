'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { goalSchema, milestoneSchema } from '../validations';
import { z } from 'zod';

export async function createGoalAction(raw: z.input<typeof goalSchema>) {
  try {
    const user = await requireAuth();
    const data = goalSchema.parse(raw);

    const startDate = new Date(data.startDate);
    const origTarget = new Date(data.originalTargetDate);
    const currTarget = data.currentTargetDate ? new Date(data.currentTargetDate) : origTarget;

    const goal = await prisma.goal.create({
      data: {
        userId: user.id,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        startDate,
        originalTargetDate: origTarget,
        currentTargetDate: currTarget,
        completionCriteria: data.completionCriteria || null,
        notes: data.notes || null,
      },
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, goal };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create goal.' };
  }
}

export async function updateGoalAction(
  goalId: string,
  raw: Partial<z.infer<typeof goalSchema>> & { status?: any; completedAt?: string | null }
) {
  try {
    const user = await requireAuth();

    // Verify ownership
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: user.id },
    });
    if (!existing) {
      return { success: false, error: 'Goal not found or access denied.' };
    }

    const updated = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(raw.title ? { title: raw.title } : {}),
        ...(raw.description !== undefined ? { description: raw.description } : {}),
        ...(raw.priority ? { priority: raw.priority } : {}),
        ...(raw.status ? { status: raw.status } : {}),
        ...(raw.currentTargetDate ? { currentTargetDate: new Date(raw.currentTargetDate) } : {}),
        ...(raw.completionCriteria !== undefined ? { completionCriteria: raw.completionCriteria } : {}),
        ...(raw.notes !== undefined ? { notes: raw.notes } : {}),
        ...(raw.completedAt !== undefined
          ? { completedAt: raw.completedAt ? new Date(raw.completedAt) : null }
          : {}),
      },
    });

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, goal: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update goal.' };
  }
}

export async function deleteGoalAction(goalId: string) {
  try {
    const user = await requireAuth();
    const existing = await prisma.goal.findFirst({
      where: { id: goalId, userId: user.id },
    });
    if (!existing) {
      return { success: false, error: 'Goal not found or access denied.' };
    }

    await prisma.goal.delete({ where: { id: goalId } });

    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete goal.' };
  }
}

export async function createMilestoneAction(raw: z.input<typeof milestoneSchema>) {
  try {
    const user = await requireAuth();
    const data = milestoneSchema.parse(raw);

    // Verify user owns the goal
    const goal = await prisma.goal.findFirst({
      where: { id: data.goalId, userId: user.id },
    });
    if (!goal) {
      return { success: false, error: 'Goal not found or access denied.' };
    }

    // If weekly milestone with parentId, verify parent monthly milestone exists
    if (data.parentId) {
      const parent = await prisma.milestone.findFirst({
        where: { id: data.parentId, goalId: data.goalId },
      });
      if (!parent) {
        return { success: false, error: 'Parent monthly milestone not found.' };
      }
    }

    const origStart = new Date(data.originalStartDate);
    const origEnd = new Date(data.originalEndDate);
    const currStart = data.currentStartDate ? new Date(data.currentStartDate) : origStart;
    const currEnd = data.currentEndDate ? new Date(data.currentEndDate) : origEnd;

    const milestone = await prisma.milestone.create({
      data: {
        goalId: data.goalId,
        parentId: data.parentId || null,
        type: data.type,
        title: data.title,
        description: data.description || null,
        weight: data.weight || 1.0,
        originalStartDate: origStart,
        originalEndDate: origEnd,
        currentStartDate: currStart,
        currentEndDate: currEnd,
        completionCriteria: data.completionCriteria || null,
        delayReason: data.delayReason || null,
      },
    });

    revalidatePath('/milestones');
    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, milestone };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create milestone.' };
  }
}

export async function updateMilestoneAction(
  milestoneId: string,
  raw: Partial<z.infer<typeof milestoneSchema>> & { status?: any; delayReason?: string }
) {
  try {
    const user = await requireAuth();

    const existing = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });

    if (!existing || existing.goal.userId !== user.id) {
      return { success: false, error: 'Milestone not found or access denied.' };
    }

    const updated = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(raw.title ? { title: raw.title } : {}),
        ...(raw.description !== undefined ? { description: raw.description } : {}),
        ...(raw.status ? { status: raw.status } : {}),
        ...(raw.weight ? { weight: raw.weight } : {}),
        ...(raw.currentStartDate ? { currentStartDate: new Date(raw.currentStartDate) } : {}),
        ...(raw.currentEndDate ? { currentEndDate: new Date(raw.currentEndDate) } : {}),
        ...(raw.delayReason ? { delayReason: raw.delayReason } : {}),
        ...(raw.completionCriteria !== undefined ? { completionCriteria: raw.completionCriteria } : {}),
        ...(raw.status === 'COMPLETED' ? { completedAt: new Date() } : {}),
      },
    });

    revalidatePath('/milestones');
    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true, milestone: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update milestone.' };
  }
}

export async function deleteMilestoneAction(milestoneId: string) {
  try {
    const user = await requireAuth();
    const existing = await prisma.milestone.findUnique({
      where: { id: milestoneId },
      include: { goal: true },
    });

    if (!existing || existing.goal.userId !== user.id) {
      return { success: false, error: 'Milestone not found or access denied.' };
    }

    await prisma.milestone.delete({ where: { id: milestoneId } });

    revalidatePath('/milestones');
    revalidatePath('/goals');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete milestone.' };
  }
}
