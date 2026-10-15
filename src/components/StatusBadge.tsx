import styles from './StatusBadge.module.css';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  let variant = 'default';
  let label = status.replace(/_/g, ' ');

  if (normalized === 'COMPLETED' || normalized === 'ON_TRACK') {
    variant = 'success';
  } else if (normalized === 'IN_PROGRESS' || normalized === 'MEDIUM') {
    variant = 'info';
  } else if (normalized === 'AT_RISK' || normalized === 'HIGH' || normalized === 'TODO') {
    variant = 'warning';
  } else if (normalized === 'BEHIND_SCHEDULE' || normalized === 'CRITICAL' || normalized === 'OVERDUE') {
    variant = 'danger';
  } else if (normalized === 'CANCELLED' || normalized === 'LOW' || normalized === 'INSUFFICIENT_DATA') {
    variant = 'muted';
  }

  return (
    <span className={`${styles.badge} ${styles[variant]} ${styles[size]}`}>
      <span className={styles.dot} />
      {label}
    </span>
  );
}
