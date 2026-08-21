import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const actions = readFileSync(
  new URL('../src/app/actions/daily-checklist.ts', import.meta.url),
  'utf8'
);
const container = readFileSync(
  new URL(
    '../src/app/admin/tasks/_components/daily-checklist-card.tsx',
    import.meta.url
  ),
  'utf8'
);
const periodColumn = readFileSync(
  new URL(
    '../src/app/admin/tasks/_components/daily-checklist/routine-period-column.tsx',
    import.meta.url
  ),
  'utf8'
);
const manager = readFileSync(
  new URL(
    '../src/app/admin/tasks/_components/daily-checklist/routine-manager.tsx',
    import.meta.url
  ),
  'utf8'
);
const sidebar = readFileSync(
  new URL(
    '../src/app/admin/tasks/_components/daily-checklist/routine-sidebar.tsx',
    import.meta.url
  ),
  'utf8'
);
const schema = readFileSync(
  new URL('../prisma/schema.prisma', import.meta.url),
  'utf8'
);
const migration = readFileSync(
  new URL(
    '../prisma/migrations/20260821130000_daily_routine_reminders/migration.sql',
    import.meta.url
  ),
  'utf8'
);

test('Daily Checklist: seleção automática mantém override, agenda e padrão nesta ordem', () => {
  const resolver = actions.slice(
    actions.indexOf('async function resolveRoutineForDate'),
    actions.indexOf('async function materializeRoutineEntries')
  );
  assert.ok(
    resolver.indexOf('routineDateOverride') <
      resolver.indexOf('dailyRoutineSchedule')
  );
  assert.ok(
    resolver.indexOf('dailyRoutineSchedule') < resolver.indexOf('isDefault')
  );
});

test('Daily Checklist: toggle otimista atualiza progresso e persiste log atomicamente', () => {
  assert.match(container, /recalculateSummary\(checklist\)/);
  assert.match(container, /optimistic-/);
  const toggle = actions.slice(
    actions.indexOf('export async function toggleDailyChecklistItem'),
    actions.indexOf('export async function updateDailyRoutineReminders')
  );
  assert.match(toggle, /db\.\$transaction/);
  assert.match(toggle, /tx\.taskActivityLog\.create/);
});

test('Daily Checklist: layout preserva três períodos e edição inline sem modal central', () => {
  assert.match(container, /CHECKLIST_PERIODS\.map/);
  assert.match(container, /lg:grid-cols-3/);
  assert.match(periodColumn, /onClick=\{onToggle\}/);
  assert.match(periodColumn, /InlineItemEditor/);
  assert.doesNotMatch(periodColumn, /DialogContent|Modal/);
  assert.match(manager, /SheetContent/);
});

test('Daily Checklist: lembretes pertencem à rotina e não usam defaults pessoais', () => {
  assert.match(schema, /reminders\s+String\[\]\s+@default\(\[\]\)/);
  assert.match(migration, /ADD COLUMN "reminders" TEXT\[\]/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM/);
  assert.match(sidebar, /Nenhum lembrete nesta rotina/);
  assert.doesNotMatch(container + sidebar, /DAILY_CHECKLIST_REMINDERS/);
});

test('Daily Checklist: faixa semanal começa na segunda e preserva snapshots', () => {
  assert.match(
    actions,
    /const mondayOffset = \(selectedDate\.getUTCDay\(\) \+ 6\) % 7/
  );
  assert.match(actions, /itemTitleSnapshot/);
  assert.match(actions, /periodSnapshot/);
  assert.match(actions, /timeRangeSnapshot/);
});
