import styles from './ProgressBar.module.css';

interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  variant?: 'primary' | 'success' | 'warning' | 'danger';
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({
  value,
  label,
  sublabel,
  variant = 'primary',
  showPercentage = true,
  size = 'md',
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value * 10) / 10));

  return (
    <div className={styles.container}>
      {(label || showPercentage) && (
        <div className={styles.header}>
          <div className={styles.labelGroup}>
            {label && <span className={styles.label}>{label}</span>}
            {sublabel && <span className={styles.sublabel}>{sublabel}</span>}
          </div>
          {showPercentage && <span className={styles.percentage}>{clamped}%</span>}
        </div>
      )}
      <div className={`${styles.track} ${styles[size]}`}>
        <div
          className={`${styles.fill} ${styles[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
