'use client';

import type { OrganizationContext } from '@/lib/organizations/context';

import { ChatWorkspace } from './chat/chat-workspace';

type OrganizationSummary = OrganizationContext['organizations'][number];

export default function Chat({
  userId,
  organization,
}: {
  userId: string;
  organization: OrganizationSummary | null;
}) {
  return <ChatWorkspace userId={userId} organization={organization} />;
}
