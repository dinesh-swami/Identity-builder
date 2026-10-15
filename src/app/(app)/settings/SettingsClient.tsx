'use client';

import React, { useState } from 'react';
import { Settings, Save, Database, ShieldCheck, Clock, Moon } from 'lucide-react';
import { updateUserSettingsAction } from '@/lib/actions/settingsActions';
import styles from './Settings.module.css';

interface SettingsClientProps {
  user: any;
  settings: any;
}

export function SettingsClient({ user, settings }: SettingsClientProps) {
  const [dailyTargetHours, setDailyTargetHours] = useState(
    Math.round((settings.dailyTargetMinutes / 60) * 10) / 10
  );
  const [timezone, setTimezone] = useState(settings.timezone || 'Asia/Kolkata');
  const [targetSleep, setTargetSleep] = useState(settings.targetSleepTime || '23:00');
  const [targetWake, setTargetWake] = useState(settings.targetWakeTime || '07:00');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const targetMins = Math.round(Number(dailyTargetHours) * 60);
    const result = await updateUserSettingsAction({
      dailyTargetMinutes: targetMins,
      timezone,
      targetSleepTime: targetSleep,
      targetWakeTime: targetWake,
    });

    if (!result.success) {
      setError(result.error || 'Failed to update settings');
    } else {
      setSuccess('Settings updated successfully!');
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>System Settings</h1>
          <p>Configure personal targets, timezone boundaries, and sleep schedules.</p>
        </div>
      </div>

      {error && <div className="errorMessage">{error}</div>}
      {success && <div className="successMessage">{success}</div>}

      {/* Target & Schedule Preferences */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Clock size={20} color="var(--accent-primary)" /> Daily Execution & Timezone Targets
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="formGroup">
            <label className="formLabel">Daily Focused-Work Target (Hours)</label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="24"
              required
              className="formInput"
              value={dailyTargetHours}
              onChange={(e) => setDailyTargetHours(Number(e.target.value))}
            />
            <span className="formHint">
              Default is 8.0 hours ({Math.round(dailyTargetHours * 60)} minutes). This sets the daily benchmark.
            </span>
          </div>

          <div className="formGroup">
            <label className="formLabel">Timezone (Day Boundary Definition)</label>
            <input
              type="text"
              required
              className="formInput"
              placeholder="e.g. Asia/Kolkata, America/New_York, Europe/London"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
            <span className="formHint">
              Used to calculate calendar-day resets, daily streak cutoffs, and session dates.
            </span>
          </div>

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

          <button
            type="submit"
            disabled={loading}
            className="btnPrimary"
            style={{ marginTop: '12px' }}
          >
            <Save size={16} /> {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </form>
      </div>

      {/* Neon PostgreSQL Connection & Migration Reference */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          <Database size={20} color="var(--info)" /> Neon PostgreSQL Configuration & Operations
        </h2>

        <div className={styles.instructionBox}>
          <p style={{ marginBottom: '12px' }}>
            Indeity is powered by <strong>PostgreSQL on Neon</strong> and <strong>Prisma ORM</strong>.
          </p>
          <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              Obtain your connection string from the <strong>Neon Console</strong> (with <code>?sslmode=require</code>).
            </li>
            <li>
              Add it to <code>.env</code> in your root directory as <code>DATABASE_URL</code> and <code>DIRECT_URL</code>.
            </li>
            <li>
              Apply the included PostgreSQL migration with:
              <br />
              <code>npx prisma db push</code> or <code>npx prisma migrate dev</code>
            </li>
            <li>
              Run automated test suite:
              <br />
              <code>npm test</code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
