import { requireAuth } from '@/lib/auth';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireAuth();

  return <SettingsClient user={user} settings={user.settings} />;
}
