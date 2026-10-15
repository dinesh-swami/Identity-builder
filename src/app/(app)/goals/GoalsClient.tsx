'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Target, Plus, GitBranch, Calendar, Trash2, Edit3, ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import { createGoalAction, updateGoalAction, deleteGoalAction } from '@/lib/actions/goalActions';
import styles from './Goals.module.css';

interface GoalsClientProps {
  initialGoals: any[];
}

export function GoalsClient({ initialGoals }: GoalsClientProps) {
  const [goals, setGoals] = useState(initialGoals);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('HIGH');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalTargetDate, setOriginalTargetDate] = useState('');
  const [currentTargetDate, setCurrentTargetDate] = useState('');
  const [completionCriteria, setCompletionCriteria] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('HIGH');
    setStartDate(new Date().toISOString().split('T')[0]);
    setOriginalTargetDate('');
    setCurrentTargetDate('');
    setCompletionCriteria('');
    setError(null);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createGoalAction({
      title,
      description,
      priority: priority as any,
      startDate,
      originalTargetDate,
      currentTargetDate: currentTargetDate || originalTargetDate,
      completionCriteria,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create goal');
      setLoading(false);
    } else {
      setIsCreateModalOpen(false);
      resetForm();
      window.location.reload();
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal and all its milestones?')) return;
    const result = await deleteGoalAction(goalId);
    if (result.success) {
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
    } else {
      alert(result.error || 'Failed to delete goal');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Long-Term Goals</h1>
          <p>
            Connect long-term vision to daily execution. Progress rolls up deterministically from milestones.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateModalOpen(true);
          }}
          className="btnPrimary"
        >
          <Plus size={16} /> New Long-Term Goal
        </button>
      </div>

      {goals.length === 0 ? (
        <div className={styles.emptyState}>
          <Target size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
          <h2>No Long-Term Goals Created Yet</h2>
          <p style={{ color: 'var(--text-muted)', maxWidth: '480px', margin: '8px auto 20px' }}>
            Indeity is built around the PLAN → EXECUTE → MEASURE → REVIEW philosophy. Start by defining your primary objective.
          </p>
          <button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            className="btnPrimary"
          >
            <Plus size={16} /> Define Your First Goal
          </button>
        </div>
      ) : (
        <div className={styles.goalsGrid}>
          {goals.map((goal) => (
            <div key={goal.id} className={styles.goalCard}>
              <div className={styles.cardTop}>
                <div>
                  <h2 className={styles.goalTitle}>{goal.title}</h2>
                  {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                </div>
                <div className={styles.badges}>
                  <StatusBadge status={goal.health.forecastStatus} size="sm" />
                  <StatusBadge status={goal.priority} size="sm" />
                </div>
              </div>

              {/* Progress Rollup Bar */}
              <ProgressBar
                label="Goal Progress"
                sublabel={`Actual: ${goal.progress}% • Planned: ${goal.health.plannedProgress}%`}
                value={goal.progress}
                size="md"
                variant={
                  goal.health.forecastStatus === 'ON_TRACK'
                    ? 'success'
                    : goal.health.forecastStatus === 'AT_RISK'
                    ? 'warning'
                    : 'danger'
                }
              />

              {/* Key Rollup Statistics */}
              <div className={styles.statsRow}>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Progress Gap</span>
                  <span
                    className={styles.statValue}
                    style={{
                      color:
                        goal.health.progressGap >= 0
                          ? 'var(--success)'
                          : goal.health.progressGap > -10
                          ? 'var(--warning)'
                          : 'var(--danger)',
                    }}
                  >
                    {goal.health.progressGap > 0 ? `+${goal.health.progressGap}` : goal.health.progressGap}%
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Delay</span>
                  <span
                    className={styles.statValue}
                    style={{
                      color: goal.health.deadlineDelayDays > 0 ? 'var(--danger)' : 'var(--text-main)',
                    }}
                  >
                    {goal.health.deadlineDelayDays > 0 ? `+${goal.health.deadlineDelayDays}d` : 'None'}
                  </span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statLabel}>Milestones</span>
                  <span className={styles.statValue}>{goal.monthlyCount}</span>
                </div>
              </div>

              {/* Planned vs Current Target Dates */}
              <div className={styles.datesRow}>
                <div>
                  Start: {new Date(goal.startDate).toLocaleDateString()}
                </div>
                <div>
                  Deadline: {new Date(goal.currentTargetDate).toLocaleDateString()}
                  {new Date(goal.currentTargetDate).getTime() > new Date(goal.originalTargetDate).getTime() && (
                    <span className={styles.delayWarning}> (orig: {new Date(goal.originalTargetDate).toLocaleDateString()})</span>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className={styles.cardActions}>
                <Link href={`/milestones?goalId=${goal.id}`} className={styles.viewMilestonesBtn}>
                  <GitBranch size={16} /> Milestones & Planning <ArrowRight size={14} />
                </Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="btnDanger"
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                    title="Delete Goal"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Goal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Long-Term Goal"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleCreateGoal}>
          <div className="formGroup">
            <label className="formLabel">Goal Title *</label>
            <input
              type="text"
              required
              className="formInput"
              placeholder="e.g. Master Production Full-Stack Engineering & Launch SaaS"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Description</label>
            <textarea
              className="formTextarea"
              placeholder="Describe what success looks like and why this goal matters..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Priority</label>
              <select
                className="formSelect"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="formGroup">
              <label className="formLabel">Start Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Original Target Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={originalTargetDate}
                onChange={(e) => setOriginalTargetDate(e.target.value)}
              />
              <span className="formHint">Recommended: 3 to 6 months horizon</span>
            </div>

            <div className="formGroup">
              <label className="formLabel">Current Target Date (optional)</label>
              <input
                type="date"
                className="formInput"
                placeholder="Leave blank to match original"
                value={currentTargetDate}
                onChange={(e) => setCurrentTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">Completion Criteria</label>
            <input
              type="text"
              className="formInput"
              placeholder="e.g. 100% test coverage, live on custom domain, 10 active users"
              value={completionCriteria}
              onChange={(e) => setCompletionCriteria(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Creating...' : 'Create Goal'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
