import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDashboardComparison,
  normalizeDashboardFilters,
  resolveDashboardPeriod,
  taskStatusesForDashboard,
  ticketStatusesForDashboard,
} from '../src/lib/dashboard/filters.ts';

test('V29: período anterior tem a mesma duração e é imediatamente anterior', () => {
  const now = new Date('2026-08-21T15:00:00-03:00');
  const range = resolveDashboardPeriod('7d', undefined, undefined, now);
  const currentDuration = range.end.getTime() - range.start.getTime();
  const previousDuration =
    range.previousEnd.getTime() - range.previousStart.getTime();

  assert.equal(currentDuration, previousDuration);
  assert.equal(range.previousEnd.getTime(), range.start.getTime());
});

test('V29: comparação sem denominador anterior retorna traço sem percentual fake', () => {
  assert.deepEqual(calculateDashboardComparison(12, 0), {
    current: 12,
    previous: 0,
    changePercent: null,
  });
  assert.equal(calculateDashboardComparison(12, 8).changePercent, 50);
  assert.equal(calculateDashboardComparison(8, 8).changePercent, 0);
});

test('V27: normalização preserva escopo e IDs enviados para validação server-side', () => {
  const normalized = normalizeDashboardFilters(
    {
      organizationId: ' org-a ',
      scope: 'organization',
      period: '30d',
      type: 'TICKET',
      teamId: ' team-a ',
      queueId: ' queue-a ',
      assigneeId: ' member-a ',
    },
    new Date('2026-08-21T15:00:00-03:00')
  );

  assert.equal(normalized.filters.organizationId, 'org-a');
  assert.equal(normalized.filters.teamId, 'team-a');
  assert.equal(normalized.filters.queueId, 'queue-a');
  assert.equal(normalized.filters.assigneeId, 'member-a');
});

test('V28: adapter de status nunca grava status de Ticket em Task', () => {
  assert.deepEqual(taskStatusesForDashboard('BACKLOG'), ['pending']);
  assert.deepEqual(taskStatusesForDashboard('WAITING'), []);
  assert.deepEqual(ticketStatusesForDashboard('OPEN'), ['OPEN']);
  assert.deepEqual(ticketStatusesForDashboard('DONE'), ['RESOLVED']);
});

test('V29: período personalizado inválido ou excessivo é rejeitado', () => {
  assert.throws(
    () =>
      resolveDashboardPeriod(
        'custom',
        '2025-01-01',
        '2026-08-21',
        new Date('2026-08-21T15:00:00-03:00')
      ),
    /entre 1 e 366 dias/
  );
  assert.throws(
    () =>
      resolveDashboardPeriod(
        'custom',
        '2026-08-21',
        '2026-08-20',
        new Date('2026-08-21T15:00:00-03:00')
      ),
    /entre 1 e 366 dias/
  );
});
