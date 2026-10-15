'use client';

import React, { useState, useEffect } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Maximize2,
  Minimize2,
  XOctagon,
  Clock,
  Sparkles,
} from 'lucide-react';
import { ProgressBar } from '@/components/ProgressBar';
import { StatusBadge } from '@/components/StatusBadge';
import { Modal } from '@/components/Modal';
import {
  startFocusSessionAction,
  takeEmergencyBreakAction,
  resumeEmergencyBreakAction,
  completeFocusSessionAction,
  abandonFocusSessionAction,
  getActiveFocusSessionAction,
} from '@/lib/actions/focusActions';
import { MAX_EMERGENCY_BREAK_SECONDS } from '@/lib/domain/focusTimer';
import styles from './Timer.module.css';

const PRESETS = [
  { minutes: 1, label: 'Sprint Test' },
  { minutes: 25, label: 'Pomodoro' },
  { minutes: 50, label: 'Deep Work' },
  { minutes: 90, label: 'Ultra Focus' },
  { minutes: 120, label: 'Master Block' },
];

interface TimerClientProps {
  initialSession: any;
  initialEvaluation: any;
  todaySessions: any[];
  tasks: any[];
  dailyTargetMinutes: number;
  initialTaskId?: string;
}

export function TimerClient({
  initialSession,
  initialEvaluation,
  todaySessions,
  tasks,
  dailyTargetMinutes,
  initialTaskId,
}: TimerClientProps) {
  const [session, setSession] = useState(initialSession);
  const [evaluation, setEvaluation] = useState(initialEvaluation);

  // Setup Form
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [linkedTaskId, setLinkedTaskId] = useState(initialTaskId || '');

  // UI state
  const [isImmersive, setIsImmersive] = useState(false);
  const [isAbandonModalOpen, setIsAbandonModalOpen] = useState(false);
  const [abandonReason, setAbandonReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live timer ticks (derived from persisted timestamps)
  const [remainingWorkSeconds, setRemainingWorkSeconds] = useState(
    evaluation?.remainingWorkSeconds || selectedDuration * 60
  );
  const [remainingBreakSeconds, setRemainingBreakSeconds] = useState(
    evaluation?.remainingBreakSeconds || MAX_EMERGENCY_BREAK_SECONDS
  );

  // Synchronize with server every 1 second when active or on break
  useEffect(() => {
    if (!session || (session.status !== 'ACTIVE' && session.status !== 'ON_BREAK')) {
      return;
    }

    const interval = setInterval(async () => {
      const now = Date.now();
      const started = new Date(session.startedAt).getTime();

      if (session.status === 'ON_BREAK') {
        const breakStart = session.breakStartedAt ? new Date(session.breakStartedAt).getTime() : now;
        const breakElapsed = Math.floor((now - breakStart) / 1000);
        const remBreak = Math.max(0, MAX_EMERGENCY_BREAK_SECONDS - breakElapsed);
        setRemainingBreakSeconds(remBreak);

        // If break exceeded 5 minutes (300 seconds), trigger authoritative server evaluation
        if (remBreak <= 0) {
          const res = await getActiveFocusSessionAction();
          if (res.session) setSession(res.session);
          if (res.evaluation) setEvaluation(res.evaluation);
        }
      } else if (session.status === 'ACTIVE') {
        const totalElapsed = Math.floor((now - started) / 1000);
        const workElapsed = Math.max(0, totalElapsed - (session.breakDurationSeconds || 0));
        const targetSec = session.targetDurationMinutes * 60;
        const remWork = Math.max(0, targetSec - workElapsed);
        setRemainingWorkSeconds(remWork);

        // If work reached target, trigger server completion
        if (remWork <= 0) {
          const res = await completeFocusSessionAction(session.id);
          if (res.success) {
            window.location.reload();
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleStartSession = async () => {
    setLoading(true);
    setError(null);

    const duration = customDuration ? parseInt(customDuration, 10) : selectedDuration;
    if (isNaN(duration) || duration <= 0) {
      setError('Please select or enter a valid positive duration in minutes.');
      setLoading(false);
      return;
    }

    const res = await startFocusSessionAction({
      targetDurationMinutes: duration,
      taskId: linkedTaskId || null,
    });

    if (!res.success) {
      setError(res.error || 'Failed to start session.');
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  const handleTakeBreak = async () => {
    if (!session) return;
    setLoading(true);
    const res = await takeEmergencyBreakAction(session.id);
    if (!res.success) {
      setError(res.error || 'Failed to take break.');
    } else {
      setSession(res.session);
    }
    setLoading(false);
  };

  const handleResumeBreak = async () => {
    if (!session) return;
    setLoading(true);
    const res = await resumeEmergencyBreakAction(session.id);
    if (!res.success) {
      setError(res.error || 'Break exceeded allowance. Block invalidated.');
      if (res.session) setSession(res.session);
    } else {
      setSession(res.session);
    }
    setLoading(false);
  };

  const handleCompleteBlock = async () => {
    if (!session) return;
    setLoading(true);
    const res = await completeFocusSessionAction(session.id);
    if (!res.success) {
      setError(res.error || 'Failed to complete session.');
      setLoading(false);
    } else {
      window.location.reload();
    }
  };

  const handleAbandon = async () => {
    if (!session) return;
    setLoading(true);
    const res = await abandonFocusSessionAction(session.id, abandonReason);
    if (!res.success) {
      setError(res.error || 'Failed to abandon session.');
      setLoading(false);
    } else {
      setIsAbandonModalOpen(false);
      window.location.reload();
    }
  };

  // Time formatters
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Metrics
  const completedMinutesToday = todaySessions
    .filter((s) => s.status === 'COMPLETED')
    .reduce((acc, s) => acc + s.creditedMinutes, 0);

  const completedBlocksCount = todaySessions.filter((s) => s.status === 'COMPLETED').length;
  const resetBlocksCount = todaySessions.filter(
    (s) => s.status === 'RESET' || s.status === 'ABANDONED'
  ).length;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Focus Timer & Daily Target</h1>
          <p>
            Zero distractions. Strictly enforced 5-minute emergency-break rule. Only completed blocks credit toward your daily target.
          </p>
        </div>

        <button
          onClick={() => setIsImmersive(!isImmersive)}
          className="btnSecondary"
          title="Toggle Fullscreen Focus Mode"
        >
          {isImmersive ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          {isImmersive ? 'Exit Focus Blocker' : 'Focus Blocker Mode'}
        </button>
      </div>

      {error && <div className="errorMessage">{error}</div>}

      {/* Main Focus Timer Card */}
      <div className={`${styles.timerCard} ${isImmersive ? styles.immersive : ''}`}>
        {isImmersive && (
          <button
            onClick={() => setIsImmersive(false)}
            className="btnSecondary"
            style={{ position: 'absolute', top: 24, right: 24 }}
          >
            <Minimize2 size={16} /> Exit Fullscreen
          </button>
        )}

        {/* Linked Task Banner if active */}
        {session && session.task?.title && (
          <div className={styles.linkedTaskBanner}>
            <Sparkles size={16} /> Working on: {session.task.title}
          </div>
        )}

        {/* Live Clock Display */}
        {session && session.status === 'ON_BREAK' ? (
          <div>
            <div className={styles.presetLabel} style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
              EMERGENCY BREAK (MAX 5 MINUTES)
            </div>
            <div className={`${styles.timerDisplay} ${styles.breakDisplay}`}>
              {formatTime(remainingBreakSeconds)}
            </div>
            <p className={styles.emergencyBreakAlert}>
              <strong>Strict Rule:</strong> Resume before this timer hits 00:00. If exceeded, this entire work block is invalidated and its progress resets to zero.
            </p>
          </div>
        ) : session && session.status === 'ACTIVE' ? (
          <div>
            <div className={styles.presetLabel} style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              TIME REMAINING ({session.targetDurationMinutes} MIN BLOCK)
            </div>
            <div className={styles.timerDisplay}>{formatTime(remainingWorkSeconds)}</div>
          </div>
        ) : (
          <div>
            <div className={styles.presetLabel} style={{ fontSize: '0.9rem', marginBottom: '8px' }}>
              READY TO COMMENCE FOCUS BLOCK
            </div>
            <div className={styles.timerDisplay}>
              {formatTime((customDuration ? parseInt(customDuration, 10) || 25 : selectedDuration) * 60)}
            </div>
          </div>
        )}

        {/* Active Session Controls */}
        {session && session.status === 'ON_BREAK' ? (
          <div className={styles.timerControls}>
            <button
              onClick={handleResumeBreak}
              disabled={loading}
              className="btnPrimary"
              style={{ padding: '14px 28px', fontSize: '1rem', background: 'var(--success)' }}
            >
              <Play size={18} /> Resume Work Session
            </button>
            <button
              onClick={() => setIsAbandonModalOpen(true)}
              disabled={loading}
              className="btnDanger"
            >
              <XOctagon size={16} /> Abandon Block
            </button>
          </div>
        ) : session && session.status === 'ACTIVE' ? (
          <div className={styles.timerControls}>
            {!session.emergencyBreakUsed ? (
              <button
                onClick={handleTakeBreak}
                disabled={loading}
                className="btnSecondary"
                style={{ borderColor: '#f59e0b', color: '#fbbf24' }}
              >
                <Pause size={16} /> Take Emergency Break (Up to 5 min)
              </button>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Emergency break already used for this block
              </span>
            )}

            <button
              onClick={handleCompleteBlock}
              disabled={loading}
              className="btnPrimary"
              style={{ background: 'var(--success)' }}
            >
              <CheckCircle2 size={18} /> Complete & Credit Block
            </button>

            <button
              onClick={() => setIsAbandonModalOpen(true)}
              disabled={loading}
              className="btnDanger"
            >
              <XOctagon size={16} /> Abandon Block
            </button>
          </div>
        ) : (
          /* New Session Setup Controls */
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div className={styles.presetGrid}>
              {PRESETS.map((p) => (
                <button
                  key={p.minutes}
                  type="button"
                  onClick={() => {
                    setSelectedDuration(p.minutes);
                    setCustomDuration('');
                  }}
                  className={`${styles.presetBtn} ${
                    !customDuration && selectedDuration === p.minutes ? styles.selected : ''
                  }`}
                >
                  <span>{p.minutes}m</span>
                  <span className={styles.presetLabel}>{p.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '16px', maxWidth: '480px', width: '100%', margin: '16px 0' }}>
              <input
                type="number"
                min="1"
                placeholder="Or custom minutes..."
                className="formInput"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
              />

              <select
                className="formSelect"
                value={linkedTaskId}
                onChange={(e) => setLinkedTaskId(e.target.value)}
              >
                <option value="">Link to Task (Optional)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="btnPrimary"
              style={{ padding: '14px 36px', fontSize: '1.05rem', marginTop: '12px' }}
            >
              <Play size={20} /> Begin Focused Work Block
            </button>
          </div>
        )}
      </div>

      {/* Daily Target Progress & Completed Sessions */}
      <div className={styles.todaySessionsCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
              Daily Focus Work Total
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Target: {Math.round((dailyTargetMinutes / 60) * 10) / 10} hours • Credited:{' '}
              {Math.round((completedMinutesToday / 60) * 10) / 10} hours (
              {completedBlocksCount} completed blocks, {resetBlocksCount} reset/abandoned)
            </p>
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {Math.min(100, Math.round((completedMinutesToday / dailyTargetMinutes) * 1000) / 10)}%
          </span>
        </div>

        <ProgressBar
          value={(completedMinutesToday / dailyTargetMinutes) * 100}
          size="lg"
          variant={completedMinutesToday >= dailyTargetMinutes ? 'success' : 'primary'}
        />

        <div style={{ marginTop: '16px' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
            Today&apos;s Session Log
          </h3>

          {todaySessions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No focus sessions completed today. Start a block above to record focused hours.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todaySessions.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    borderLeft: `4px solid ${
                      s.status === 'COMPLETED' ? 'var(--success)' : 'var(--danger)'
                    }`,
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <strong>{s.targetDurationMinutes} min block</strong>{' '}
                    {s.task?.title ? `(${s.task.title})` : ''}
                    {s.resetReason && (
                      <span style={{ color: 'var(--danger)', display: 'block', fontSize: '0.75rem' }}>
                        Reason: {s.resetReason}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <StatusBadge status={s.status} size="sm" />
                    <span>+{s.creditedMinutes}m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Abandon Confirmation */}
      <Modal
        isOpen={isAbandonModalOpen}
        onClose={() => setIsAbandonModalOpen(false)}
        title="Abandon Focus Block"
      >
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
          Abandoning this block will invalidate it. Incomplete work time is strictly NOT credited to your daily total, but the attempt is preserved in your history.
        </p>

        <div className="formGroup">
          <label className="formLabel">Reason for Abandoning</label>
          <input
            type="text"
            className="formInput"
            placeholder="e.g. Urgent phone call, unexpected interruption"
            value={abandonReason}
            onChange={(e) => setAbandonReason(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
          <button
            type="button"
            className="btnSecondary"
            onClick={() => setIsAbandonModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleAbandon}
            className="btnDanger"
          >
            Confirm Abandon Block
          </button>
        </div>
      </Modal>
    </div>
  );
}
