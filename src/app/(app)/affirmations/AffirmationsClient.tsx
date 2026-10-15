'use client';

import React, { useState } from 'react';
import { Flame, CheckCircle2, AlertCircle, Sparkles, Send, Calendar } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StatusBadge } from '@/components/StatusBadge';
import { validateAffirmation, MIN_WORDS, MIN_CHARS } from '@/lib/domain/affirmation';
import { submitAffirmationAction } from '@/lib/actions/affirmationActions';
import styles from './Affirmations.module.css';

interface AffirmationsClientProps {
  todayAffirmation: any;
  streakRecord: any;
  history: any[];
  todayDateStr: string;
}

export function AffirmationsClient({
  todayAffirmation,
  streakRecord,
  history,
  todayDateStr,
}: AffirmationsClientProps) {
  const [text, setText] = useState(todayAffirmation?.text || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Live evaluation
  const validation = validateAffirmation(text);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (!validation.isValid) {
      setError(validation.errorMessages.join(' '));
      setLoading(false);
      return;
    }

    const res = await submitAffirmationAction(text);
    if (!res.success) {
      setError(res.error || 'Failed to submit affirmation.');
      setLoading(false);
    } else {
      setSuccess(
        res.streakResult?.isNewDayCredit
          ? `Affirmation saved! Daily streak increased to ${res.streakRecord.currentStreak} days!`
          : 'Affirmation updated successfully.'
      );
      setLoading(false);
      window.location.reload();
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>Daily Affirmations & Streaks</h1>
          <p>
            Build unshakeable personal identity. Required: minimum 50 words AND 300 characters of meaningful commitment daily.
          </p>
        </div>

        <StatusBadge
          status={todayAffirmation ? 'COMPLETED' : 'TODO'}
          size="md"
        />
      </div>

      {/* Streak KPI Cards */}
      <div className={styles.streakOverview}>
        <StatCard
          title="Current Streak"
          value={`${streakRecord?.currentStreak || 0} Days`}
          subvalue={todayAffirmation ? 'Today completed' : 'Pending for today'}
          icon={<Flame size={20} color="var(--accent-primary)" />}
        />

        <StatCard
          title="Longest Streak"
          value={`${streakRecord?.longestStreak || 0} Days`}
          subvalue="All-time personal record"
          icon={<Sparkles size={20} color="var(--warning)" />}
        />

        <StatCard
          title="Total Qualifying Days"
          value={`${streakRecord?.totalDaysCompleted || 0} Days`}
          subvalue="Historical affirmed days"
          icon={<CheckCircle2 size={20} color="var(--success)" />}
        />
      </div>

      {/* Affirmation Writing Card */}
      <div className={styles.editorCard}>
        <div className={styles.editorHeader}>
          <h2 className={styles.editorTitle}>
            <Flame size={20} color="#f59e0b" /> Daily Affirmation for {todayDateStr}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {todayAffirmation ? 'Already Completed Today (Editable)' : 'Required for Daily Streak Credit'}
          </span>
        </div>

        {error && <div className="errorMessage">{error}</div>}
        {success && <div className="successMessage">{success}</div>}

        <form onSubmit={handleSubmit}>
          <textarea
            className={styles.textarea}
            placeholder="Write your affirmation of discipline, personal responsibility, and daily execution... (Must contain at least 50 words and at least 300 characters to qualify for the streak)."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {/* Live Validation Counters */}
          <div className={styles.liveCounters}>
            <div
              className={`${styles.counterItem} ${
                validation.wordCount >= MIN_WORDS ? styles.valid : styles.invalid
              }`}
            >
              <span>Words:</span>
              <strong>
                {validation.wordCount} / {MIN_WORDS}
              </strong>
              {validation.wordCount < MIN_WORDS && (
                <span style={{ fontSize: '0.75rem' }}>({validation.wordsNeeded} needed)</span>
              )}
            </div>

            <div
              className={`${styles.counterItem} ${
                validation.charCount >= MIN_CHARS ? styles.valid : styles.invalid
              }`}
            >
              <span>Characters:</span>
              <strong>
                {validation.charCount} / {MIN_CHARS}
              </strong>
              {validation.charCount < MIN_CHARS && (
                <span style={{ fontSize: '0.75rem' }}>({validation.charsNeeded} needed)</span>
              )}
            </div>

            <div>
              {validation.isValid ? (
                <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.85rem' }}>
                  ✓ Valid for daily streak credit
                </span>
              ) : (
                <span style={{ color: 'var(--warning)', fontSize: '0.82rem' }}>
                  ⚠ Incomplete requirements
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
            <button
              type="submit"
              disabled={loading || !validation.isValid}
              className="btnPrimary"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            >
              <Send size={16} />
              {loading
                ? 'Validating & Saving...'
                : todayAffirmation
                ? 'Update Today’s Affirmation'
                : 'Save & Earn Daily Streak Credit'}
            </button>
          </div>
        </form>
      </div>

      {/* Historical Affirmations Log */}
      <div className={styles.historyCard}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={18} color="var(--accent-primary)" /> Affirmation History ({history.length} entries)
        </h3>

        {history.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            No past affirmations saved yet. Save your first affirmation above.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {history.map((item) => (
              <div key={item.id} className={styles.historyItem}>
                <div className={styles.historyTop}>
                  <strong>Date: {item.calendarDate}</strong>
                  <span>
                    {item.wordCount} words • {item.charCount} chars
                  </span>
                </div>
                <p className={styles.historyText}>&quot;{item.text}&quot;</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
