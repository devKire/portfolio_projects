import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWorkItems,
  filterWorkItems,
  workLaneToTaskStatus,
  workLaneToTicketStatus,
} from '../src/lib/work/adapter.ts';
import type { TaskWithRelations } from '../src/types/tasks.ts';
import type { TicketRow } from '../src/types/work.ts';

function task(id: string, title = `Task ${id}`): TaskWithRelations {
  return {
    id,
    title,
    status: 'pending',
    priority: 'medium',
    position: 0,
    tags: ['infra'],
    organizationId: null,
    assigneeId: 'user-1',
    createdAt: new Date('2026-08-20T10:00:00Z'),
    updatedAt: new Date('2026-08-20T10:00:00Z'),
  };
}

function ticket(id: string, linkedTaskId: string | null = null): TicketRow {
  return {
    id,
    organizationId: 'org-1',
    linkedTaskId,
    title: `Ticket ${id}`,
    description: 'Falha de VPN',
    status: 'OPEN',
    priority: 'URGENT',
    queueId: 'queue-1',
    teamId: 'team-1',
    requesterId: 'user-1',
    assigneeId: 'user-2',
    createdAt: new Date('2026-08-20T11:00:00Z'),
    updatedAt: new Date('2026-08-20T11:00:00Z'),
    queue: { id: 'queue-1', name: 'Suporte N1', active: true },
    team: { id: 'team-1', name: 'Suporte', active: true },
    requester: { id: 'user-1', name: 'João', username: 'joao' },
    assignee: { id: 'user-2', name: 'Maria', username: 'maria' },
    activities: [],
  };
}

test('V22: linked ticket is the only canonical operational item', () => {
  const items = createWorkItems(
    [task('linked'), task('standalone')],
    [ticket('ticket-1', 'linked')]
  );
  assert.equal(items.length, 2);
  assert.equal(
    items.some((item) => item.key === 'TASK:linked'),
    false
  );
  assert.equal(
    items.some((item) => item.key === 'TICKET:ticket-1'),
    true
  );
  assert.equal(
    items.some((item) => item.key === 'TASK:standalone'),
    true
  );
});

test('V22: type, queue, project, tag and search filters respect kind', () => {
  const items = createWorkItems(
    [{ ...task('task-1', 'Configurar servidor'), projectId: 'project-1' }],
    [ticket('ticket-1')]
  );
  assert.deepEqual(
    filterWorkItems(items, { kind: 'TICKET', queueId: 'queue-1' }).map(
      (item) => item.kind
    ),
    ['TICKET']
  );
  assert.deepEqual(
    filterWorkItems(items, { kind: 'TASK', tag: 'infra' }).map(
      (item) => item.kind
    ),
    ['TASK']
  );
  assert.equal(filterWorkItems(items, { search: 'vpn' }).length, 1);
});

test('V24: due date filters remain specific to Tasks', () => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const items = createWorkItems(
    [{ ...task('due-today'), dueDate: today }],
    [ticket('ticket-without-task-due-date')]
  );
  assert.deepEqual(
    filterWorkItems(items, { dueDateRange: 'today' }).map((item) => item.key),
    ['TASK:due-today']
  );
});

test('V23: Kanban lanes map only to valid entity statuses', () => {
  assert.equal(workLaneToTaskStatus('BACKLOG'), 'pending');
  assert.equal(workLaneToTaskStatus('DONE'), 'completed');
  assert.equal(workLaneToTaskStatus('WAITING'), null);
  assert.equal(workLaneToTaskStatus('CLOSED'), null);
  assert.equal(workLaneToTicketStatus('WAITING'), 'WAITING');
  assert.equal(workLaneToTicketStatus('DONE'), 'RESOLVED');
  assert.equal(workLaneToTicketStatus('CLOSED'), 'CLOSED');
});
