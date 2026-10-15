'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Target,
  GitBranch,
  CheckSquare,
  Timer,
  Flame,
  BarChart3,
  Settings,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { logoutAction } from '@/lib/actions/authActions';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Goals', href: '/goals', icon: Target },
  { label: 'Milestones', href: '/milestones', icon: GitBranch },
  { label: 'Daily Tasks', href: '/daily', icon: CheckSquare },
  { label: 'Focus Timer', href: '/timer', icon: Timer },
  { label: 'Affirmations & Streaks', href: '/affirmations', icon: Flame },
  { label: 'Analytics & Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar({ user }: { user?: { name?: string | null; email: string } | null }) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.brandLogo}>
          <ShieldCheck size={24} className={styles.brandIcon} />
        </div>
        <div className={styles.brandInfo}>
          <span className={styles.brandTitle}>INDEITY</span>
          <span className={styles.brandSubtitle}>Execution OS</span>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={18} className={styles.navIcon} />
              <span className={styles.navLabel}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className={styles.footer}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>
              {(user.name || user.email).charAt(0).toUpperCase()}
            </div>
            <div className={styles.userDetails}>
              <span className={styles.userName}>{user.name || 'Personal User'}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          </div>
          <button
            onClick={async () => {
              await logoutAction();
              window.location.href = '/login';
            }}
            className={styles.logoutBtn}
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </aside>
  );
}
