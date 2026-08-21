import { TaskShortcutsHint } from '../tasks/_components/task-shortcuts-hint';
import { TaskPageClient } from '../tasks/_components/TaskPageClient';

export default function Tasks({
  activeOrganizationId,
}: {
  activeOrganizationId: string | null;
}) {
  return (
    <>
      <TaskPageClient activeOrganizationId={activeOrganizationId} />
      <TaskShortcutsHint />
    </>
  );
}
