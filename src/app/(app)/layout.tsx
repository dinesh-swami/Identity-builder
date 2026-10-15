import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import styles from './layout.module.css';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.appContainer}>
      <Sidebar user={user} />
      <main className={styles.mainContent}>
        <div className={styles.contentWrapper}>{children}</div>
      </main>
    </div>
  );
}
