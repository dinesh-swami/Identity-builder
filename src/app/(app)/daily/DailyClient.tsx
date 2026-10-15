'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckSquare,
  Plus,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Check,
  Trash2,
  Moon,
  Sparkles,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  createTaskAction,
  updateTaskStatusAction,
  rescheduleTaskAction,
  deleteTaskAction,
} from '@/lib/actions/taskActions';
import { saveDailyReviewAction, saveScheduleLogAction } from '@/lib/actions/reviewActions';
import styles from './Daily.module.css';

interface DailyClientProps {
  tasks: any[];
  goals: any[];
  weeklyMilestones: any[];
  currentDateStr: string;
  dailyReview: any;
  scheduleLog: any;
  userSettings: any;
}

export function DailyClient({
  tasks,
  goals,
  weeklyMilestones,
  currentDateStr,
  dailyReview,
  scheduleLog,
  userSettings,
}: DailyClientProps) {
  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [rescheduleTargetTask, setRescheduleTargetTask] = useState<any | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSleepModalOpen, setIsSleepModalOpen] = useState(false);

  // Form states: Create Task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('MEDIUM');
  const [taskEstMinutes, setTaskEstMinutes] = useState(30);
  const [taskMilestoneId, setTaskMilestoneId] = useState('');
  const [taskGoalId, setTaskGoalId] = useState('');

  // Form states: Reschedule
  const [rescheduleNewDate, setRescheduleNewDate] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Form states: Daily Review
  const [completedSummary, setCompletedSummary] = useState(dailyReview?.completedSummary || '');
  const [failedSummary, setFailedSummary] = useState(dailyReview?.failedSummary || '');
  const [failureReason, setFailureReason] = useState(dailyReview?.failureReason || '');
  const [carryForwardPlan, setCarryForwardPlan] = useState(dailyReview?.carryForwardPlan || '');
  const [tomorrowChanges, setTomorrowChanges] = useState(dailyReview?.tomorrowChanges || '');
  const [reviewScore, setReviewScore] = useState(dailyReview?.score || 8);

  // Form states: Sleep Log
  const [targetSleep, setTargetSleep] = useState(scheduleLog?.targetSleepTime || userSettings?.targetSleepTime || '23:00');
  const [targetWake, setTargetWake] = useState(scheduleLog?.targetWakeTime || userSettings?.targetWakeTime || '07:00');
  const [actualSleep, setActualSleep] = useState(scheduleLog?.actualSleepTime || '23:30');
  const [actualWake, setActualWake] = useState(scheduleLog?.actualWakeTime || '07:30');
  const [sleepNotes, setSleepNotes] = useState(scheduleLog?.notes || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggleTaskStatus = async (task: any) => {
    const nextStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
    await updateTaskStatusAction(task.id, nextStatus as any);
    window.location.reload();
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createTaskAction({
      title: taskTitle,
      description: taskDesc,
      priority: taskPriority as any,
      estimatedMinutes: Number(taskEstMinutes) || 30,
      assignedDate: currentDateStr,
      milestoneId: taskMilestoneId || null,
      goalId: taskGoalId || null,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create task');
      setLoading(false);
    } else {
      setIsCreateModalOpen(false);
      setTaskTitle('');
      setTaskDesc('');
      window.location.reload();
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTargetTask) return;
    setLoading(true);
    setError(null);

    const result = await rescheduleTaskAction({
      taskId: rescheduleTargetTask.id,
      newPlannedDate: rescheduleNewDate,
      delayReason: rescheduleReason,
    });

    if (!result.success) {
      setError(result.error || 'Failed to reschedule task');
      setLoading(false);
    } else {
      setRescheduleTargetTask(null);
      window.location.reload();
    }
  };

  const handleSaveReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await saveDailyReviewAction({
      calendarDate: currentDateStr,
      completedSummary,
      failedSummary,
      failureReason,
      carryForwardPlan,
      tomorrowChanges,
      score: Number(reviewScore) || 7,
    });

    if (!result.success) {
      setError(result.error || 'Failed to save review');
      setLoading(false);
    } else {
      setIsReviewModalOpen(false);
      window.location.reload();
    }
  };

  const handleSaveSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await saveScheduleLogAction({
      calendarDate: currentDateStr,
      targetSleepTime: targetSleep,
      targetWakeTime: targetWake,
      actualSleepTime: actualSleep,
      actualWakeTime: actualWake,
      notes: sleepNotes,
    });

    if (!result.success) {
      setError(result.error || 'Failed to save schedule log');
      setLoading(false);
    } else {
      setIsSleepModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    await deleteTaskAction(id);
    window.location.reload();
  };

  // Date navigation helpers
  const navigateDay = (offsetDays: number) => {
    const d = new Date(currentDateStr);
    d.setDate(d.getDate() + offsetDays);
    const nextStr = d.toISOString().split('T')[0];
    window.location.href = `/daily?date=${nextStr}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Daily Planning & Execution</h1>
          <p>
            Execute ruthlessly. Every task preserves original deadlines and rescheduling audits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Date Navigator */}
          <div className={styles.dateNav}>
            <button
              onClick={() => navigateDay(-1)}
              className={styles.navArrowBtn}
              title="Previous Day"
            >
              <ChevronLeft size={16} />
            </button>
            <span className={styles.dateTitle}>{currentDateStr}</span>
            <button
              onClick={() => navigateDay(1)}
              className={styles.navArrowBtn}
              title="Next Day"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => {
              setError(null);
              setIsCreateModalOpen(true);
            }}
            className="btnPrimary"
          >
            <Plus size={16} /> Add Task
          </button>
        </div>
      </div>

      <div className={styles.layoutGrid}>
        {/* Left Column: Tasks List */}
        <div className={styles.taskListCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Tasks for {currentDateStr} ({tasks.length})
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Completed: {tasks.filter((t) => t.status === 'COMPLETED').length} of {tasks.length}
            </span>
          </div>

          {tasks.length === 0 ? (
            <div className={styles.emptyTasks}>
              <p>No tasks planned for this date yet.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btnSecondary"
                style={{ marginTop: '12px' }}
              >
                <Plus size={14} /> Add a Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tasks.map((task) => {
                const isOverdue =
                  task.status !== 'COMPLETED' &&
                  new Date(task.currentPlannedDate).getTime() < new Date().setHours(0, 0, 0, 0);
                const wasRescheduled =
                  task.currentPlannedDate.split('T')[0] !== task.originalPlannedDate.split('T')[0];

                return (
                  <div key={task.id} className={styles.taskItem}>
                    <div className={styles.taskItemMain}>
                      <div className={styles.taskItemLeft}>
                        <button
                          onClick={() => handleToggleTaskStatus(task)}
                          className={`${styles.checkboxBtn} ${
                            task.status === 'COMPLETED' ? styles.checked : ''
                          }`}
                        >
                          {task.status === 'COMPLETED' && <Check size={14} />}
                        </button>

                        <div className={styles.taskDetails}>
                          <span
                            className={`${styles.taskTitle} ${
                              task.status === 'COMPLETED' ? styles.completed : ''
                            }`}
                          >
                            {task.title}
                          </span>
                          {task.description && <p className={styles.taskDesc}>{task.description}</p>}

                          <div className={styles.taskMeta}>
                            <StatusBadge status={task.priority} size="sm" />
                            {isOverdue && <StatusBadge status="OVERDUE" size="sm" />}
                            <span>
                              <Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />
                              Est: {task.estimatedMinutes}m • Actual: {task.actualMinutes}m
                            </span>
                            {task.milestone && (
                              <span>Milestone: <strong>{task.milestone.title}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {task.status !== 'COMPLETED' && (
                          <Link
                            href={`/timer?taskId=${task.id}`}
                            className="btnSecondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Start Focus Timer for this Task"
                          >
                            <Timer size={13} /> Focus
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setRescheduleTargetTask(task);
                            setRescheduleNewDate(new Date().toISOString().split('T')[0]);
                            setRescheduleReason('');
                          }}
                          className="btnSecondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          title="Reschedule Task (Preserves Audit Trail)"
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          style={{ color: 'var(--text-muted)', padding: '6px' }}
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Rescheduling & Delay Audit Trail Note */}
                    {wasRescheduled && (
                      <div className={styles.taskAuditInfo}>
                        <AlertCircle size={14} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Rescheduled:</strong> Originally planned for{' '}
                          {new Date(task.originalPlannedDate).toLocaleDateString()}. Reason: &quot;
                          {task.delayReason || 'Rescheduled'}&quot;
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Execution Review & Sleep Log */}
        <div className={styles.sidePanel}>
          {/* End-of-Day Execution Review */}
          <div className={styles.panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="var(--accent-primary)" /> Daily Execution Review
              </h3>
              <button
                onClick={() => setIsReviewModalOpen(true)}
                className="btnSecondary"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                {dailyReview ? 'Edit Review' : 'Log Review'}
              </button>
            </div>

            {dailyReview ? (
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Score: </span>
                  <strong>{dailyReview.score} / 10</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Completed: </span>
                  <p style={{ marginTop: '2px' }}>{dailyReview.completedSummary}</p>
                </div>
                {dailyReview.failedSummary && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Bottlenecks / Delays: </span>
                    <p style={{ marginTop: '2px', color: '#fca5a5' }}>{dailyReview.failedSummary}</p>
                  </div>
                )}
                {dailyReview.tomorrowChanges && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Tomorrow&apos;s Adjustment: </span>
                    <p style={{ marginTop: '2px', color: '#6ee7b7' }}>{dailyReview.tomorrowChanges}</p>
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Complete your end-of-day execution review to lock in lessons and carry forward tasks.
              </p>
            )}
          </div>

          {/* Sleep & Wake Schedule Log */}
          <div className={styles.panelCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Moon size={18} color="var(--info)" /> Schedule & Sleep
              </h3>
              <button
                onClick={() => setIsSleepModalOpen(true)}
                className="btnSecondary"
                style={{ fontSize: '0.78rem', padding: '4px 10px' }}
              >
                {scheduleLog ? 'Edit Log' : 'Log Schedule'}
              </button>
            </div>

            {scheduleLog ? (
              <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Actual Sleep:</span>
                  <strong>{scheduleLog.actualSleepTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Actual Wake:</span>
                  <strong>{scheduleLog.actualWakeTime}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Duration:</span>
                  <strong>{Math.round((scheduleLog.sleepDurationMinutes / 60) * 10) / 10} hours</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Target Met:</span>
                  <StatusBadge status={scheduleLog.metTarget ? 'ON_TRACK' : 'AT_RISK'} size="sm" />
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Track target sleep and wake times to maintain optimal energy and focus.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Create Task */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Add Daily Task"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleCreateTask}>
          <div className="formGroup">
            <label className="formLabel">Task Title *</label>
            <input
              type="text"
              required
              className="formInput"
              placeholder="e.g. Implement Prisma migrations & domain test suite"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Description (optional)</label>
            <textarea
              className="formTextarea"
              placeholder="Execution checklist or notes..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Priority</label>
              <select
                className="formSelect"
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value)}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="formGroup">
              <label className="formLabel">Estimated Duration (mins)</label>
              <input
                type="number"
                min="5"
                step="5"
                className="formInput"
                value={taskEstMinutes}
                onChange={(e) => setTaskEstMinutes(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">Link to Weekly Milestone (Optional)</label>
            <select
              className="formSelect"
              value={taskMilestoneId}
              onChange={(e) => setTaskMilestoneId(e.target.value)}
            >
              <option value="">None (Independent Task)</option>
              {weeklyMilestones.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title} ({w.goalTitle})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Adding...' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Reschedule Task */}
      <Modal
        isOpen={!!rescheduleTargetTask}
        onClose={() => setRescheduleTargetTask(null)}
        title="Reschedule Task (Audit Trail Preserved)"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleReschedule}>
          <div style={{ marginBottom: '16px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            Task: <strong>{rescheduleTargetTask?.title}</strong>
            <br />
            Original Planned Date:{' '}
            {rescheduleTargetTask &&
              new Date(rescheduleTargetTask.originalPlannedDate).toLocaleDateString()}
          </div>

          <div className="formGroup">
            <label className="formLabel">New Planned Date *</label>
            <input
              type="date"
              required
              className="formInput"
              value={rescheduleNewDate}
              onChange={(e) => setRescheduleNewDate(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Delay Reason (Mandatory for audit trail) *</label>
            <input
              type="text"
              required
              minLength={3}
              className="formInput"
              placeholder="e.g. Underestimated API integration complexity"
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setRescheduleTargetTask(null)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Rescheduling...' : 'Reschedule & Save Audit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Daily Review */}
      <Modal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        title="End-of-Day Execution Review"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleSaveReview}>
          <div className="formGroup">
            <label className="formLabel">What did you complete today? *</label>
            <textarea
              required
              className="formTextarea"
              placeholder="Summary of finished objectives..."
              value={completedSummary}
              onChange={(e) => setCompletedSummary(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">What did you fail to complete?</label>
            <textarea
              className="formTextarea"
              placeholder="Unfinished tasks or missed targets..."
              value={failedSummary}
              onChange={(e) => setFailedSummary(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">What was the main reason / bottleneck?</label>
            <input
              type="text"
              className="formInput"
              placeholder="e.g. Distractions, underestimated effort, poor energy"
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">What will you carry forward to tomorrow?</label>
            <input
              type="text"
              className="formInput"
              placeholder="Priority tasks carrying over..."
              value={carryForwardPlan}
              onChange={(e) => setCarryForwardPlan(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">What will you change or adjust tomorrow?</label>
            <input
              type="text"
              className="formInput"
              placeholder="Adjustment in routine or focus block strategy..."
              value={tomorrowChanges}
              onChange={(e) => setTomorrowChanges(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Daily Execution Rating (1 to 10)</label>
            <input
              type="number"
              min="1"
              max="10"
              className="formInput"
              value={reviewScore}
              onChange={(e) => setReviewScore(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsReviewModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Saving...' : 'Save Daily Review'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Sleep & Wake Log */}
      <Modal
        isOpen={isSleepModalOpen}
        onClose={() => setIsSleepModalOpen(false)}
        title="Schedule & Sleep Log"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleSaveSleep}>
          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Target Sleep Time</label>
              <input
                type="time"
                required
                className="formInput"
                value={targetSleep}
                onChange={(e) => setTargetSleep(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label className="formLabel">Target Wake Time</label>
              <input
                type="time"
                required
                className="formInput"
                value={targetWake}
                onChange={(e) => setTargetWake(e.target.value)}
              />
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Actual Sleep Time</label>
              <input
                type="time"
                required
                className="formInput"
                value={actualSleep}
                onChange={(e) => setActualSleep(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label className="formLabel">Actual Wake Time</label>
              <input
                type="time"
                required
                className="formInput"
                value={actualWake}
                onChange={(e) => setActualWake(e.target.value)}
              />
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">Notes (optional)</label>
            <input
              type="text"
              className="formInput"
              placeholder="Sleep quality or energy level..."
              value={sleepNotes}
              onChange={(e) => setSleepNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsSleepModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Saving...' : 'Save Sleep Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
