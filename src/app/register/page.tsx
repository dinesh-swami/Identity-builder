'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { registerAction } from '@/lib/actions/authActions';
import styles from '../login/AuthForm.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await registerAction({ email, password, name });
      if (!result.success) {
        setError(result.error || 'Failed to initialize account.');
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.logoBadge}>
            <ShieldCheck size={28} />
          </div>
          <h1 className={styles.title}>Initialize Indeity</h1>
          <p className={styles.subtitle}>Set up your master account for personal execution</p>
        </div>

        {error && <div className="errorMessage">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className="formGroup">
            <label className="formLabel" htmlFor="name">Your Name</label>
            <input
              id="name"
              type="text"
              required
              className="formInput"
              placeholder="e.g. Commander / Alex"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              className="formInput"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="formGroup">
            <label className="formLabel" htmlFor="password">Set Master Password (min 8 characters)</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              className="formInput"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btnPrimary ${styles.submitBtn}`}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Initializing...
              </>
            ) : (
              <>
                Create Account & Launch <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          Already initialized?
          <Link href="/login" className={styles.link}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
