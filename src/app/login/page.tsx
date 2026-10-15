'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { loginAction } from '@/lib/actions/authActions';
import styles from './AuthForm.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await loginAction({ email, password });
      if (!result.success) {
        setError(result.error || 'Invalid credentials');
        setLoading(false);
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
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
          <h1 className={styles.title}>Welcome to Indeity</h1>
          <p className={styles.subtitle}>Enter your credentials to access your Execution OS</p>
        </div>

        {error && <div className="errorMessage">{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
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
            <label className="formLabel" htmlFor="password">Master Password</label>
            <input
              id="password"
              type="password"
              required
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
                <Loader2 size={18} className="animate-spin" /> Authenticating...
              </>
            ) : (
              <>
                Open Execution OS <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footer}>
          First time here?
          <Link href="/register" className={styles.link}>
            Initialize Master Account
          </Link>
        </div>

        <div className={styles.dbNotice}>
          <strong>Neon PostgreSQL Setup:</strong> If this is your first run, make sure to add your database credentials in <code>.env</code> and run <code>npm run prisma:push</code>.
        </div>
      </div>
    </div>
  );
}
