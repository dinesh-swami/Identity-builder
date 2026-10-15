import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { computeGoalProgress } from '@/lib/domain/progress';
import { calculateScheduleHealth } from '@/lib/domain/scheduleHealth';
import { GoalsClient } from './GoalsClient';

export const dynamic = 'force-dynamic';

export default async function GoalsPage() {
  const user = await requireAuth();

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    include: {
      milestones: {
        include: {
          tasks: true,
          children: {
            include: {
              tasks: true,
            },
          },
        },
      },
      tasks: true,
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });

  const calculatedGoals = goals.map((goal) => {
    const monthlyMilestones = goal.milestones
      .filter((m) => m.type === 'MONTHLY')
      .map((m) => {
        const weeklyChildren = goal.milestones
          .filter((w) => w.parentId === m.id)
          .map((w) => ({
            id: w.id,
            status: w.status,
            weight: w.weight,
            tasks: w.tasks.map((t) => ({ id: t.id, status: t.status, weight: t.weight })),
          }));

        return {
          id: m.id,
          status: m.status,
          weight: m.weight,
          weeklyMilestones: weeklyChildren,
        };
      });

    const progressResult = computeGoalProgress(monthlyMilestones);

    const health = calculateScheduleHealth({
      startDate: goal.startDate,
      originalTargetDate: goal.originalTargetDate,
      currentTargetDate: goal.currentTargetDate,
      completedAt: goal.completedAt,
      actualProgress: progressResult.progressPercentage,
      tasks: goal.tasks.map((t) => ({
        status: t.status,
        originalPlannedDate: t.originalPlannedDate,
        currentPlannedDate: t.currentPlannedDate,
        completedAt: t.completedAt,
      })),
    });

    return {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      priority: goal.priority,
      status: goal.status,
      startDate: goal.startDate.toISOString(),
      originalTargetDate: goal.originalTargetDate.toISOString(),
      currentTargetDate: goal.currentTargetDate.toISOString(),
      progress: progressResult.progressPercentage,
      health,
      monthlyCount: monthlyMilestones.length,
      tasksCount: goal.tasks.length,
    };
  });

  return <GoalsClient initialGoals={calculatedGoals} />;
}
