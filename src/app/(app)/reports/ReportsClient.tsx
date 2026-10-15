'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Target,
  Flame,
  Moon,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { ProgressBar } from '@/components/ProgressBar';
import styles from './Reports.module.css';

interface ReportsClientProps {
  reportsData: any;
}

export function ReportsClient({ reportsData }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'goals'>('daily');
  const { selectedDate, dailyReport, weeklyReport, goalReports } = reportsData;

  const maxWeeklyHours = Math.max(
    8,
    ...weeklyReport.dayBreakdown.map((d: any) => d.hours)
  );

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Analytics & Execution Reports</h1>
          <p>
            Measure real execution. Discover patterns, track consistency, and separate schedule health from progress.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date:</span>
          <input
            type="date"
            className="formInput"
            style={{ width: 'auto', padding: '6px 12px' }}
            defaultValue={selectedDate}
            onChange={(e) => {
              if (e.target.value) {
                window.location.href = `/reports?date=${e.target.value}`;
              }
            }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsRow}>
        <button
          onClick={() => setActiveTab('daily')}
          className={`${styles.tabBtn} ${activeTab === 'daily' ? styles.active : ''}`}
        >
          Daily Report ({selectedDate})
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`${styles.tabBtn} ${activeTab === 'weekly' ? styles.active : ''}`}
        >
          Weekly Trends (Past 7 Days)
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`${styles.tabBtn} ${activeTab === 'goals' ? styles.active : ''}`}
        >
          Long-Term Goal Reports ({goalReports.length})
        </button>
      </div>

      {/* 1. DAILY REPORT TAB */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.statsGrid}>
            <StatCard
              title="Focus Target vs Actual"
              value={`${dailyReport.completedHours}h / ${dailyReport.targetHours}h`}
              subvalue={`${dailyReport.targetProgressPercent}% of daily target completed`}
              icon={<Clock size={18} />}
            />
            <StatCard
              title="Focus Blocks"
              value={`${dailyReport.completedBlocksCount} Completed`}
              subvalue={`${dailyReport.interruptedBlocksCount} reset / abandoned`}
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              title="Daily Tasks"
              value={`${dailyReport.completedTasksCount} / ${dailyReport.plannedTasksCount}`}
              subvalue={`${dailyReport.overdueTasksCount} incomplete tasks`}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              title="Affirmation & Streak"
              value={dailyReport.affirmation ? 'Affirmed' : 'Pending'}
              subvalue={`Current streak: ${dailyReport.streakRecord?.currentStreak || 0} days`}
              icon={<Flame size={18} />}
              badge={
                <StatusBadge
                  status={dailyReport.affirmation ? 'COMPLETED' : 'TODO'}
                  size="sm"
                />
              }
            />
          </div>

          {/* Daily Review & Sleep Log */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>
                <CheckCircle2 size={18} color="var(--accent-primary)" /> Daily Execution Review
              </h3>
              {dailyReport.dailyReview ? (
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <strong>Completed:</strong>
                    <p style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>
                      {dailyReport.dailyReview.completedSummary}
                    </p>
                  </div>
                  {dailyReport.dailyReview.failedSummary && (
                    <div>
                      <strong>Bottlenecks / Missed Targets:</strong>
                      <p style={{ marginTop: '2px', color: '#fca5a5' }}>
                        {dailyReport.dailyReview.failedSummary}
                      </p>
                    </div>
                  )}
                  {dailyReport.dailyReview.tomorrowChanges && (
                    <div>
                      <strong>Adjustment Tomorrow:</strong>
                      <p style={{ marginTop: '2px', color: '#6ee7b7' }}>
                        {dailyReport.dailyReview.tomorrowChanges}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No end-of-day review logged for this date.
                </p>
              )}
            </div>

            <div className={styles.card}>
              <h3 className={styles.sectionTitle}>
                <Moon size={18} color="var(--info)" /> Schedule & Sleep Adherence
              </h3>
              {dailyReport.dailyScheduleLog ? (
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Actual Sleep / Wake:</span>
                    <strong>
                      {dailyReport.dailyScheduleLog.actualSleepTime} —{' '}
                      {dailyReport.dailyScheduleLog.actualWakeTime}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sleep Duration:</span>
                    <strong>
                      {Math.round((dailyReport.dailyScheduleLog.sleepDurationMinutes / 60) * 10) / 10} hours
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Target Schedule Met:</span>
                    <StatusBadge
                      status={dailyReport.dailyScheduleLog.metTarget ? 'ON_TRACK' : 'AT_RISK'}
                      size="sm"
                    />
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No sleep log recorded for this date.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. WEEKLY REPORT TAB */}
      {activeTab === 'weekly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className={styles.statsGrid}>
            <StatCard
              title="Total Focused Work"
              value={`${weeklyReport.totalHours} hrs`}
              subvalue={`Previous 7 days: ${weeklyReport.prevWeekTotalHours} hrs`}
              trend={
                weeklyReport.totalHours >= weeklyReport.prevWeekTotalHours
                  ? `+${Math.round((weeklyReport.totalHours - weeklyReport.prevWeekTotalHours) * 10) / 10}h vs prev week`
                  : `-${Math.round((weeklyReport.prevWeekTotalHours - weeklyReport.totalHours) * 10) / 10}h vs prev week`
              }
              trendPositive={weeklyReport.totalHours >= weeklyReport.prevWeekTotalHours}
              icon={<Clock size={18} />}
            />
            <StatCard
              title="Daily Average Focus"
              value={`${weeklyReport.dailyAverageHours} hrs/day`}
              subvalue="Target: 8.0 hrs/day"
              icon={<TrendingUp size={18} />}
            />
            <StatCard
              title="Task Completion Rate"
              value={`${weeklyReport.completionRate}%`}
              subvalue={`${weeklyReport.completedTasksCount} of ${weeklyReport.plannedTasksCount} tasks`}
              icon={<CheckCircle2 size={18} />}
            />
            <StatCard
              title="On-Time Completion Rate"
              value={`${weeklyReport.onTimeRate}%`}
              subvalue="Completed by original deadline"
              icon={<Target size={18} />}
            />
          </div>

          {/* Day-by-Day Focus Work Chart */}
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className={styles.sectionTitle}>
                <BarChart3 size={18} color="var(--accent-primary)" /> Daily Focus Work Hours (Past 7 Days)
              </h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Target: {weeklyReport.dayBreakdown[0]?.targetHours || 8}h/day
              </span>
            </div>

            <div className={styles.chartContainer}>
              {weeklyReport.dayBreakdown.map((item: any) => {
                const heightPercent = Math.min(100, Math.round((item.hours / maxWeeklyHours) * 100));
                return (
                  <div key={item.day} className={styles.barCol}>
                    <span className={styles.barValue}>{item.hours}h</span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{
                          height: `${Math.max(4, heightPercent)}%`,
                          background:
                            item.hours >= item.targetHours
                              ? 'linear-gradient(180deg, #10b981, #059669)'
                              : 'linear-gradient(180deg, #6366f1, #4338ca)',
                        }}
                      />
                    </div>
                    <span className={styles.barLabel}>{item.displayDay}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. LONG-TERM GOALS REPORT TAB */}
      {activeTab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {goalReports.length === 0 ? (
            <div className={styles.card} style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No long-term goals found to generate reports.</p>
              <Link href="/goals" className="btnPrimary" style={{ margin: '12px auto 0', display: 'inline-flex' }}>
                Create a Goal
              </Link>
            </div>
          ) : (
            goalReports.map((g: any) => (
              <div key={g.id} className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{g.title}</h3>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <span>Start: {g.startDate}</span>
                      <span>Target: {g.currentTargetDate}</span>
                      {g.health.deadlineDelayDays > 0 && (
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          Deadline Delay: +{g.health.deadlineDelayDays} days
                        </span>
                      )}
                      <span>Total Focused Work: {g.totalFocusHours} hrs</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <StatusBadge status={g.health.forecastStatus} size="sm" />
                    <StatusBadge status={g.priority} size="sm" />
                  </div>
                </div>

                {/* Progress Rollup vs Planned Progress */}
                <ProgressBar
                  label="Goal Rollup Progress"
                  sublabel={`Actual Progress: ${g.actualProgress}% • Planned Progress: ${g.health.plannedProgress}% • Progress Gap: ${g.health.progressGap > 0 ? '+' : ''}${g.health.progressGap}%`}
                  value={g.actualProgress}
                  size="md"
                  variant={
                    g.health.forecastStatus === 'ON_TRACK'
                      ? 'success'
                      : g.health.forecastStatus === 'AT_RISK'
                      ? 'warning'
                      : 'danger'
                  }
                />

                {/* Monthly Milestones Rollup Breakdown */}
                <div style={{ marginTop: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Monthly Milestone Breakdown ({g.monthlyMilestones.length})
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                    {g.monthlyMilestones.map((m: any) => (
                      <div
                        key={m.id}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          padding: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <strong>{m.title}</strong>
                          <StatusBadge status={m.status} size="sm" />
                        </div>
                        <ProgressBar value={m.progress} size="sm" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
