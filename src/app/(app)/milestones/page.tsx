import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { computeWeeklyMilestoneProgress, computeMonthlyMilestoneProgress } from '@/lib/domain/progress';
import { MilestonesClient } from './MilestonesClient';

export const dynamic = 'force-dynamic';

export default async function MilestonesPage({
  searchParams,
}: {
  searchParams?: { goalId?: string };
}) {
  const user = await requireAuth();

  const [goals, milestones] = await Promise.all([
    prisma.goal.findMany({
      where: { userId: user.id },
      select: { id: true, title: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.milestone.findMany({
      where: {
        goal: { userId: user.id },
        type: 'MONTHLY',
      },
      include: {
        goal: { select: { id: true, title: true } },
        children: {
          include: {
            tasks: true,
          },
        },
      },
      orderBy: { originalStartDate: 'asc' },
    }),
  ]);

  const monthlyMilestones = milestones.map((m) => {
    const weeklyChildren = m.children.map((w) => {
      const taskItems = w.tasks.map((t) => ({ id: t.id, status: t.status, weight: t.weight }));
      const weekProgress = computeWeeklyMilestoneProgress(taskItems);
      return {
        id: w.id,
        goalId: w.goalId,
        parentId: w.parentId,
        title: w.title,
        description: w.description,
        status: w.status,
        weight: w.weight,
        originalStartDate: w.originalStartDate.toISOString(),
        originalEndDate: w.originalEndDate.toISOString(),
        currentStartDate: w.currentStartDate.toISOString(),
        currentEndDate: w.currentEndDate.toISOString(),
        progress: weekProgress.progressPercentage,
        tasksCount: w.tasks.length,
      };
    });

    const monthItems = weeklyChildren.map((w) => ({
      id: w.id,
      status: w.status as any,
      weight: w.weight,
      progress: w.progress,
    }));

    const monthProgress = computeMonthlyMilestoneProgress(monthItems);

    return {
      id: m.id,
      goalId: m.goalId,
      goal: m.goal,
      title: m.title,
      description: m.description,
      status: m.status,
      weight: m.weight,
      originalStartDate: m.originalStartDate.toISOString(),
      originalEndDate: m.originalEndDate.toISOString(),
      currentStartDate: m.currentStartDate.toISOString(),
      currentEndDate: m.currentEndDate.toISOString(),
      progress: monthProgress.progressPercentage,
      weeklyMilestones: weeklyChildren,
    };
  });

  return (
    <MilestonesClient
      goals={goals}
      monthlyMilestones={monthlyMilestones}
      initialGoalId={searchParams?.goalId}
    />
  );
}
