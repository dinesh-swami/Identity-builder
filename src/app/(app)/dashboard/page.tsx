import { getDashboardData } from '@/lib/data/dashboard';
import { DashboardClient } from './DashboardClient';
import { isDatabaseConfigured } from '@/lib/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const isConfigured = isDatabaseConfigured();

  let data = null;
  let dbError = null;

  try {
    data = await getDashboardData();
  } catch (err: any) {
    dbError = err.message || 'Database error';
  }

  if (!data) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }}>
        <div className="errorMessage" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '12px' }}>
            Database Setup Required (Neon PostgreSQL)
          </h2>
          <p style={{ marginBottom: '16px' }}>
            Indeity is designed to connect to your PostgreSQL database hosted on Neon.
            {dbError && <span style={{ display: 'block', marginTop: '8px' }}>Error details: {dbError}</span>}
          </p>
          <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '0.85rem' }}>
            1. Copy your Neon PostgreSQL connection string.<br />
            2. Update <code>.env</code> with <code>DATABASE_URL="postgresql://user:password@ep-...neon.tech/indeity?sslmode=require"</code><br />
            3. Run <code>npm run prisma:push</code> to synchronize the schema.<br />
            4. Register your master account at <Link href="/register" style={{ color: '#818cf8', textDecoration: 'underline' }}>/register</Link>.
          </div>
        </div>
      </div>
    );
  }

  return <DashboardClient data={data} />;
}
