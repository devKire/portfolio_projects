import AdminPanel from './_components/AdminPanel';
import { requireUser } from '@/lib/auth/session';

export default async function AdminPage() {
  const user = await requireUser();
  const primaryLandingPage = user.landingPages[0];

  return (
    <AdminPanel
      user={{
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        publicSlug: primaryLandingPage?.slug || user.username,
      }}
    />
  );
}
