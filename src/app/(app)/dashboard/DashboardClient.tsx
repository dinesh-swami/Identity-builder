'use client';

import React from 'react';
import Link from 'next/link';
import {
  Timer,
  Target,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Play,
  RotateCcw,
} from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import styles from './Dashboard.module.css';

interface DashboardProps {
  data: any;
}

export function DashboardClient({ data }: DashboardProps) {
  const {
    user,
    todayDateStr,
    focusMetrics,
    activeSession,
    activeSessionEvaluation,
    recentSessions,
    affirmationStatus,
    todayTasks,
    overdueTasks,
    goals,
  } = data;

  return (
    <div className={styles.container}>
      {/* Welcome & Timezone Header */}
      <div className={styles.welcomeHeader}>
        <div>
          <h1 className={styles.greeting}>Execution Command — {user?.name || 'Personal OS'}</h1>
          <div className={styles.dateBadge}>
            Today: {todayDateStr} ({user?.settings?.timezone || 'Asia/Kolkata'})
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/timer" className="btnPrimary">
            <Timer size={16} /> Focus Mode
          </Link>
          <Link href="/daily" className="btnSecondary">
            <Clock size={16} /> Daily Plan
          </Link>
        </div>
      </div>

      {/* Active Focus Session Banner (if running) */}
      {activeSession && (
        <div className={styles.activeSessionBanner}>
          <div className={styles.activeSessionInfo}>
            <div className={styles.pulsingDot} />
            <div className={styles.activeSessionText}>
              <span className={styles.activeSessionTitle}>
                {activeSession.status === 'ON_BREAK' ? 'Emergency Break Active' : 'Focus Session Running'} (
                {activeSession.targetDurationMinutes} min block)
              </span>
              <span className={styles.activeSessionSubtitle}>
                {activeSession.task?.title
                  ? `Linked Task: ${activeSession.task.title}`
                  : 'Independent Focus Session'}
                {' • '}
                {activeSessionEvaluation && (
                  <>
                    {activeSession.status === 'ON_BREAK'
                      ? `${activeSessionEvaluation.remainingBreakSeconds}s break remaining`
                      : `${Math.ceil(activeSessionEvaluation.remainingWorkSeconds / 60)} min work remaining`}
                  </>
                )}
              </span>
            </div>
          </div>
          <Link href="/timer" className="btnPrimary">
            Resume Timer <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Core KPI Metrics */}
      <div className={styles.gridStats}>
        <StatCard
          title="Daily Focus Target"
          value={`${focusMetrics.completedHours}h / ${focusMetrics.targetHours}h`}
          subvalue={`${focusMetrics.remainingHours}h remaining to hit target`}
          icon={<Timer size={18} />}
          badge={
            <StatusBadge
              status={focusMetrics.targetProgressPercent >= 100 ? 'COMPLETED' : 'IN_PROGRESS'}
              size="sm"
            />
          }
        />

        <StatCard
          title="Daily Target Progress"
          value={`${focusMetrics.targetProgressPercent}%`}
          subvalue={`${focusMetrics.completedBlocksCount} completed blocks • ${focusMetrics.interruptedBlocksCount} reset/abandoned`}
          icon={<TrendingUp size={18} />}
        />

        <StatCard
          title="Affirmation Streak"
          value={`${affirmationStatus.currentStreak} Days`}
          subvalue={`Longest: ${affirmationStatus.longestStreak} days • ${affirmationStatus.totalDaysCompleted} total qualified`}
          icon={<Flame size={18} />}
          badge={
            <StatusBadge
              status={affirmationStatus.completedToday ? 'COMPLETED' : 'TODO'}
              size="sm"
            />
          }
        />

        <StatCard
          title="Daily Tasks"
          value={`${todayTasks.completedCount} / ${todayTasks.totalCount}`}
          subvalue={
            overdueTasks.length > 0
              ? `${overdueTasks.length} overdue tasks pending`
              : 'All daily tasks on schedule'
          }
          icon={<CheckCircle2 size={18} />}
          badge={
            overdueTasks.length > 0 ? (
              <StatusBadge status="OVERDUE" size="sm" />
            ) : (
              <StatusBadge status="ON_TRACK" size="sm" />
            )
          }
        />
      </div>

      {/* Progress Bar for Daily Focus Work */}
      <div className={styles.card}>
        <ProgressBar
          label="Today's Focused-Work Execution"
          sublabel={`Credited: ${focusMetrics.completedMinutes} mins (${focusMetrics.completedHours} hrs) of ${focusMetrics.targetMinutes} mins target`}
          value={focusMetrics.targetProgressPercent}
          size="lg"
          variant={focusMetrics.targetProgressPercent >= 100 ? 'success' : 'primary'}
        />
      </div>

      {/* Section Grid: Long-Term Goals Rollup & Today's Tasks */}
      <div className={styles.sectionGrid}>
        {/* Left Column: Long-Term Goals Hierarchy Rollup */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>
              <Target size={20} color="var(--accent-primary)" /> Long-Term Goals & Hierarchy Rollup
            </h2>
            <Link href="/goals" className={styles.viewAllLink}>
              Manage Goals <ArrowRight size={14} />
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No goals defined yet.</p>
              <Link href="/goals" className="btnPrimary" style={{ marginTop: '12px' }}>
                Create Your First Goal
              </Link>
            </div>
          ) : (
            <div className={styles.goalList}>
              {goals.map((goal: any) => (
                <div key={goal.id} className={styles.goalItem}>
                  <div className={styles.goalItemTop}>
                    <span className={styles.goalItemTitle}>{goal.title}</span>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <StatusBadge status={goal.health.forecastStatus} size="sm" />
                      <StatusBadge status={goal.priority} size="sm" />
                    </div>
                  </div>

                  <ProgressBar
                    value={goal.progress}
                    sublabel={`Actual Progress: ${goal.progress}% • Planned: ${goal.health.plannedProgress}% (Gap: ${goal.health.progressGap > 0 ? '+' : ''}${goal.health.progressGap}%)`}
                    size="sm"
                    variant={
                      goal.health.forecastStatus === 'ON_TRACK'
                        ? 'success'
                        : goal.health.forecastStatus === 'AT_RISK'
                        ? 'warning'
                        : 'danger'
                    }
                  />

                  <div className={styles.goalMeta}>
                    <span>Target Date: {new Date(goal.currentTargetDate).toLocaleDateString()}</span>
                    {goal.health.deadlineDelayDays > 0 && (
                      <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        Delay: +{goal.health.deadlineDelayDays} days
                      </span>
                    )}
                    <span>{goal.monthlyCount} Monthly Milestones</span>
                    <span>{goal.tasksCount} Linked Tasks</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Today's Tasks & Recent Focus Blocks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Today's Tasks */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <CheckCircle2 size={18} color="var(--success)" /> Today's Action Items
              </h2>
              <Link href="/daily" className={styles.viewAllLink}>
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {todayTasks.all.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No tasks scheduled for today.</p>
                <Link href="/daily" className="btnSecondary" style={{ marginTop: '10px' }}>
                  Plan Today's Tasks
                </Link>
              </div>
            ) : (
              <div className={styles.taskList}>
                {todayTasks.all.slice(0, 5).map((task: any) => (
                  <div key={task.id} className={styles.taskItem}>
                    <div className={styles.taskItemLeft}>
                      <span
                        className={`${styles.taskTitle} ${
                          task.status === 'COMPLETED' ? styles.completed : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Focus Blocks */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Clock size={18} color="var(--info)" /> Today's Focus Blocks
              </h2>
              <Link href="/timer" className={styles.viewAllLink}>
                Timer <ArrowRight size={14} />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No focus blocks completed yet today.</p>
              </div>
            ) : (
              <div className={styles.sessionList}>
                {recentSessions.map((session: any) => (
                  <div
                    key={session.id}
                    className={`${styles.sessionItem} ${
                      session.status === 'COMPLETED'
                        ? styles.completed
                        : styles.reset
                    }`}
                  >
                    <div>
                      <strong>{session.targetDurationMinutes} min</strong> block{' '}
                      {session.task?.title ? `(${session.task.title})` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {new Date(session.startedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <StatusBadge status={session.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
