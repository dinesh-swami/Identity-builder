'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GitBranch, Plus, Calendar, Trash2, CheckSquare, ArrowRight } from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  createMilestoneAction,
  updateMilestoneAction,
  deleteMilestoneAction,
} from '@/lib/actions/goalActions';
import styles from './Milestones.module.css';

interface MilestonesClientProps {
  goals: any[];
  monthlyMilestones: any[];
  initialGoalId?: string;
}

export function MilestonesClient({
  goals,
  monthlyMilestones,
  initialGoalId,
}: MilestonesClientProps) {
  const [selectedGoalId, setSelectedGoalId] = useState(initialGoalId || 'ALL');
  const [milestones, setMilestones] = useState(monthlyMilestones);

  // Modals
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [isWeekModalOpen, setIsWeekModalOpen] = useState(false);
  const [targetMonthlyParentId, setTargetMonthlyParentId] = useState<string | null>(null);
  const [targetGoalIdForWeek, setTargetGoalIdForWeek] = useState<string | null>(null);

  // Form states for Monthly Milestone
  const [mGoalId, setMGoalId] = useState(goals[0]?.id || '');
  const [mTitle, setMTitle] = useState('');
  const [mDescription, setMDescription] = useState('');
  const [mWeight, setMWeight] = useState(1.0);
  const [mStartDate, setMStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [mEndDate, setMEndDate] = useState('');
  const [mCriteria, setMCriteria] = useState('');

  // Form states for Weekly Milestone
  const [wTitle, setWTitle] = useState('');
  const [wDescription, setWDescription] = useState('');
  const [wWeight, setWWeight] = useState(1.0);
  const [wStartDate, setWStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [wEndDate, setWEndDate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredMonthly =
    selectedGoalId === 'ALL'
      ? milestones
      : milestones.filter((m) => m.goalId === selectedGoalId);

  const handleCreateMonthly = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createMilestoneAction({
      goalId: mGoalId,
      type: 'MONTHLY',
      title: mTitle,
      description: mDescription,
      weight: Number(mWeight) || 1.0,
      originalStartDate: mStartDate,
      originalEndDate: mEndDate,
      completionCriteria: mCriteria,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create monthly milestone');
      setLoading(false);
    } else {
      setIsMonthModalOpen(false);
      window.location.reload();
    }
  };

  const handleCreateWeekly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMonthlyParentId || !targetGoalIdForWeek) return;
    setLoading(true);
    setError(null);

    const result = await createMilestoneAction({
      goalId: targetGoalIdForWeek,
      parentId: targetMonthlyParentId,
      type: 'WEEKLY',
      title: wTitle,
      description: wDescription,
      weight: Number(wWeight) || 1.0,
      originalStartDate: wStartDate,
      originalEndDate: wEndDate,
    });

    if (!result.success) {
      setError(result.error || 'Failed to create weekly milestone');
      setLoading(false);
    } else {
      setIsWeekModalOpen(false);
      window.location.reload();
    }
  };

  const handleDeleteMilestone = async (id: string) => {
    if (!confirm('Are you sure you want to delete this milestone?')) return;
    const res = await deleteMilestoneAction(id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || 'Failed to delete');
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    await updateMilestoneAction(id, { status: newStatus as any });
    window.location.reload();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Milestones & Planning</h1>
          <p>
            The execution bridge: Long-Term Goal → Monthly Milestones → Weekly Milestones → Daily Tasks.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {goals.length > 0 && (
            <button
              onClick={() => {
                setError(null);
                setMGoalId(selectedGoalId !== 'ALL' ? selectedGoalId : goals[0].id);
                setIsMonthModalOpen(true);
              }}
              className="btnPrimary"
            >
              <Plus size={16} /> New Monthly Milestone
            </button>
          )}
        </div>
      </div>

      {/* Filter by Goal */}
      <div className={styles.filtersRow}>
        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Filter by Goal:
        </label>
        <select
          className={styles.filterSelect}
          value={selectedGoalId}
          onChange={(e) => setSelectedGoalId(e.target.value)}
        >
          <option value="ALL">All Goals ({goals.length})</option>
          {goals.map((g) => (
            <option key={g.id} value={g.id}>
              {g.title}
            </option>
          ))}
        </select>
      </div>

      {goals.length === 0 ? (
        <div className={styles.emptyState}>
          <GitBranch size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
          <h2>No Goals Available</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px auto 20px', maxWidth: '420px' }}>
            Milestones belong to goals. Please create a long-term goal first before defining monthly and weekly milestones.
          </p>
          <Link href="/goals" className="btnPrimary">
            Create a Goal
          </Link>
        </div>
      ) : filteredMonthly.length === 0 ? (
        <div className={styles.emptyState}>
          <GitBranch size={48} color="var(--accent-primary)" style={{ margin: '0 auto 16px' }} />
          <h2>No Milestones Defined for this Goal</h2>
          <p style={{ color: 'var(--text-muted)', margin: '8px auto 20px', maxWidth: '420px' }}>
            Break down this long-term goal into 30-day target blocks (monthly milestones).
          </p>
          <button
            onClick={() => {
              setError(null);
              setMGoalId(selectedGoalId !== 'ALL' ? selectedGoalId : goals[0].id);
              setIsMonthModalOpen(true);
            }}
            className="btnPrimary"
          >
            <Plus size={16} /> Add Monthly Milestone
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {filteredMonthly.map((monthly) => (
            <div key={monthly.id} className={styles.monthlySection}>
              <div className={styles.monthlyHeader}>
                <div>
                  <div className={styles.monthlyTitleRow}>
                    <span className={styles.monthBadge}>Monthly Milestone</span>
                    <h2 className={styles.monthlyTitle}>{monthly.title}</h2>
                    <StatusBadge status={monthly.status} size="sm" />
                  </div>
                  <div className={styles.goalTag}>
                    Belongs to Goal: <strong>{monthly.goal?.title}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      setTargetMonthlyParentId(monthly.id);
                      setTargetGoalIdForWeek(monthly.goalId);
                      setWTitle('');
                      setWDescription('');
                      setIsWeekModalOpen(true);
                    }}
                    className="btnSecondary"
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Plus size={14} /> Add Weekly Milestone
                  </button>
                  <button
                    onClick={() => handleDeleteMilestone(monthly.id)}
                    className="btnDanger"
                    style={{ padding: '6px 10px' }}
                    title="Delete Monthly Milestone"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Rollup Bar from child weekly milestones */}
              <ProgressBar
                label="Monthly Milestone Progress (Rollup from Weekly Milestones)"
                value={monthly.progress}
                size="md"
                variant={monthly.progress === 100 ? 'success' : 'primary'}
              />

              {/* Child Weekly Milestones Grid */}
              <div style={{ marginTop: '8px' }}>
                <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Weekly Milestones ({monthly.weeklyMilestones.length})
                </h3>

                {monthly.weeklyMilestones.length === 0 ? (
                  <div className={styles.emptyWeeks}>
                    No weekly milestones defined for this month yet. Click &quot;Add Weekly Milestone&quot; to break down the work.
                  </div>
                ) : (
                  <div className={styles.weeklyGrid}>
                    {monthly.weeklyMilestones.map((week: any) => (
                      <div key={week.id} className={styles.weeklyCard}>
                        <div className={styles.weeklyTop}>
                          <span className={styles.weeklyTitle}>{week.title}</span>
                          <StatusBadge status={week.status} size="sm" />
                        </div>

                        <ProgressBar
                          label="Task Rollup"
                          value={week.progress}
                          size="sm"
                          variant={week.progress === 100 ? 'success' : 'primary'}
                        />

                        <div className={styles.dates}>
                          {new Date(week.currentStartDate).toLocaleDateString()} —{' '}
                          {new Date(week.currentEndDate).toLocaleDateString()}
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '8px',
                            borderTop: '1px solid var(--border-subtle)',
                            paddingTop: '10px',
                          }}
                        >
                          <Link
                            href={`/daily?milestoneId=${week.id}`}
                            style={{
                              fontSize: '0.78rem',
                              color: 'var(--accent-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 600,
                            }}
                          >
                            <CheckSquare size={13} /> {week.tasksCount} Tasks <ArrowRight size={12} />
                          </Link>

                          <button
                            onClick={() => handleDeleteMilestone(week.id)}
                            style={{ color: 'var(--text-muted)', padding: '4px' }}
                            title="Delete Week"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create Monthly Milestone */}
      <Modal
        isOpen={isMonthModalOpen}
        onClose={() => setIsMonthModalOpen(false)}
        title="Add Monthly Milestone"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleCreateMonthly}>
          <div className="formGroup">
            <label className="formLabel">Assign to Goal *</label>
            <select
              className="formSelect"
              value={mGoalId}
              onChange={(e) => setMGoalId(e.target.value)}
              required
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="formGroup">
            <label className="formLabel">Milestone Title *</label>
            <input
              type="text"
              required
              className="formInput"
              placeholder="e.g. Complete Backend Fundamentals & Core Engine"
              value={mTitle}
              onChange={(e) => setMTitle(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Description</label>
            <textarea
              className="formTextarea"
              placeholder="Key deliverable and scope for this monthly milestone..."
              value={mDescription}
              onChange={(e) => setMDescription(e.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Start Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={mStartDate}
                onChange={(e) => setMStartDate(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label className="formLabel">Target End Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={mEndDate}
                onChange={(e) => setMEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">Weight (Relative contribution to Goal)</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="formInput"
              value={mWeight}
              onChange={(e) => setMWeight(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsMonthModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Creating...' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Weekly Milestone */}
      <Modal
        isOpen={isWeekModalOpen}
        onClose={() => setIsWeekModalOpen(false)}
        title="Add Weekly Milestone"
      >
        {error && <div className="errorMessage">{error}</div>}
        <form onSubmit={handleCreateWeekly}>
          <div className="formGroup">
            <label className="formLabel">Weekly Milestone Title *</label>
            <input
              type="text"
              required
              className="formInput"
              placeholder="e.g. Implement Node.js, Express, Auth, and Session Rules"
              value={wTitle}
              onChange={(e) => setWTitle(e.target.value)}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel">Description</label>
            <textarea
              className="formTextarea"
              placeholder="Objectives to accomplish by end of week..."
              value={wDescription}
              onChange={(e) => setWDescription(e.target.value)}
            />
          </div>

          <div className="formRow">
            <div className="formGroup">
              <label className="formLabel">Week Start Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={wStartDate}
                onChange={(e) => setWStartDate(e.target.value)}
              />
            </div>
            <div className="formGroup">
              <label className="formLabel">Week End Date *</label>
              <input
                type="date"
                required
                className="formInput"
                value={wEndDate}
                onChange={(e) => setWEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="formGroup">
            <label className="formLabel">Weight</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              className="formInput"
              value={wWeight}
              onChange={(e) => setWWeight(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button
              type="button"
              className="btnSecondary"
              onClick={() => setIsWeekModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btnPrimary">
              {loading ? 'Adding...' : 'Add Weekly Milestone'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
