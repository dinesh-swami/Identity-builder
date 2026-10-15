'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../prisma';
import { requireAuth } from '../auth';
import { taskSchema, taskRescheduleSchema } from '../validations';
import { z } from 'zod';
import { TaskStatus } from '@prisma/client';

export async function createTaskAction(raw: z.input<typeof taskSchema>) {
  try {
    const user = await requireAuth();
    const data = taskSchema.parse(raw);

    const assignedDate = new Date(data.assignedDate);

    // Verify milestone ownership if linked
    if (data.milestoneId) {
      const milestone = await prisma.milestone.findUnique({
        where: { id: data.milestoneId },
        include: { goal: true },
      });
      if (!milestone || milestone.goal.userId !== user.id) {
        return { success: false, error: 'Linked milestone not found or access denied.' };
      }
    }

    const task = await prisma.$transaction(async (tx) => {
      const newTask = await tx.task.create({
        data: {
          userId: user.id,
          goalId: data.goalId || null,
          milestoneId: data.milestoneId || null,
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          status: data.status || 'TODO',
          weight: data.weight || 1.0,
          assignedDate,
          dueTime: data.dueTime || null,
          originalPlannedDate: assignedDate,
          currentPlannedDate: assignedDate,
          estimatedMinutes: data.estimatedMinutes || 30,
          actualMinutes: data.actualMinutes || 0,
        },
      });

      // Audit trail: CREATED event
      await tx.planChangeEvent.create({
        data: {
          taskId: newTask.id,
          changeType: 'CREATED',
          oldValue: null,
          newValue: newTask.title,
          reason: 'Initial task creation',
        },
      });

      return newTask;
    });

    revalidatePath('/daily');
    revalidatePath('/milestones');
    revalidatePath('/dashboard');
    return { success: true, task };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create task.' };
  }
}

export async function updateTaskStatusAction(taskId: string, newStatus: TaskStatus) {
  try {
    const user = await requireAuth();

    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!existing) {
      return { success: false, error: 'Task not found or access denied.' };
    }

    const completedAt = newStatus === 'COMPLETED' ? new Date() : null;

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { id: taskId },
        data: {
          status: newStatus,
          completedAt,
        },
      });

      await tx.planChangeEvent.create({
        data: {
          taskId,
          changeType: 'STATUS_CHANGED',
          oldValue: existing.status,
          newValue: newStatus,
          reason: `Status changed to ${newStatus}`,
        },
      });

      return t;
    });

    revalidatePath('/daily');
    revalidatePath('/milestones');
    revalidatePath('/dashboard');
    return { success: true, task: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update task status.' };
  }
}

export async function rescheduleTaskAction(raw: z.infer<typeof taskRescheduleSchema>) {
  try {
    const user = await requireAuth();
    const data = taskRescheduleSchema.parse(raw);

    const existing = await prisma.task.findFirst({
      where: { id: data.taskId, userId: user.id },
    });
    if (!existing) {
      return { success: false, error: 'Task not found or access denied.' };
    }

    const newDate = new Date(data.newPlannedDate);

    const updated = await prisma.$transaction(async (tx) => {
      // Never overwrite originalPlannedDate! Only update currentPlannedDate and assignedDate
      const t = await tx.task.update({
        where: { id: data.taskId },
        data: {
          assignedDate: newDate,
          currentPlannedDate: newDate,
          delayReason: data.delayReason,
        },
      });

      await tx.planChangeEvent.create({
        data: {
          taskId: data.taskId,
          changeType: 'RESCHEDULED',
          oldValue: existing.currentPlannedDate.toISOString().split('T')[0],
          newValue: newDate.toISOString().split('T')[0],
          reason: data.delayReason,
        },
      });

      return t;
    });

    revalidatePath('/daily');
    revalidatePath('/milestones');
    revalidatePath('/dashboard');
    return { success: true, task: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to reschedule task.' };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const user = await requireAuth();
    const existing = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
    });
    if (!existing) {
      return { success: false, error: 'Task not found or access denied.' };
    }

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath('/daily');
    revalidatePath('/milestones');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete task.' };
  }
}
