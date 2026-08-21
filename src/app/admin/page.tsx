import AdminPanel from './_components/AdminPanel';
import { requireUser } from '@/lib/auth/session';
import { getOrganizationContextForUser } from '@/lib/organizations/context';

export default async function AdminPage() {
  const user = await requireUser();
  const primaryLandingPage = user.landingPages[0];
  const organizationContext = await getOrganizationContextForUser(user.id);

  return (
    <AdminPanel
      user={{
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        publicSlug: primaryLandingPage?.slug || user.username,
      }}
      organizationContext={organizationContext}
    />
  );
}
