import React from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subvalue?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: string;
  trendPositive?: boolean;
}

export function StatCard({
  title,
  value,
  subvalue,
  icon,
  badge,
  trend,
  trendPositive,
}: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.title}>{title}</span>
        {icon && <div className={styles.icon}>{icon}</div>}
      </div>
      <div className={styles.body}>
        <div className={styles.valueRow}>
          <span className={styles.value}>{value}</span>
          {badge && <div className={styles.badge}>{badge}</div>}
        </div>
        {subvalue && <span className={styles.subvalue}>{subvalue}</span>}
        {trend && (
          <span className={`${styles.trend} ${trendPositive ? styles.positive : styles.negative}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
