import { TaskShortcutsHint } from '../tasks/_components/task-shortcuts-hint';
import { TaskPageClient } from '../tasks/_components/TaskPageClient';

export default function Tasks() {
  return (
    <>
      <TaskPageClient />
      <TaskShortcutsHint />
    </>
  );
}
