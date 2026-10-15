import { requireAuth } from '@/lib/auth';
import { getReportsData } from '@/lib/data/reports';
import { ReportsClient } from './ReportsClient';

export const dynamic = 'force-dynamic';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: { date?: string };
}) {
  await requireAuth();

  const reportsData = await getReportsData(searchParams?.date);

  if (!reportsData) {
    return <div>Failed to load report data.</div>;
  }

  return <ReportsClient reportsData={reportsData} />;
}
