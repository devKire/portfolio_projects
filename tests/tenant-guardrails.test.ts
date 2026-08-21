import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('V2/V7: KCS actions require membership and resource scope', () => {
  const kcs = source('src/app/actions/kcs.ts');

  assert.match(
    kcs,
    /requireOrganizationMembership\(user\.id, organizationId\)/
  );
  assert.match(kcs, /where: \{ id: noteId, \.\.\.scoped \}/);
  assert.match(kcs, /where: \{ id: folderId, \.\.\.scoped/);
  assert.match(kcs, /organizationNoteScope\(organizationId\)/);
  assert.match(kcs, /visibility: 'PRIVATE'/);
});

test('V1/V13: personal Notes explicitly exclude organization records', () => {
  const notes = source('src/app/actions/notes.ts');
  const exportRoute = source('src/app/api/notes/export-vault/route.ts');

  assert.match(notes, /organizationId: null/);
  assert.match(notes, /scopeKey: personalNoteScope\(userId\)/);
  assert.match(exportRoute, /organizationId: null/);
  assert.match(exportRoute, /scopeKey: personalNoteScope\(user\.id\)/);
});

test('V2/V7: KCS import and export validate membership before using scope', () => {
  const kcs = source('src/app/actions/kcs.ts');
  const exportRoute = source('src/app/api/notes/export-vault/route.ts');
  const importRoute = source('src/app/api/notes/import-vault/route.ts');

  assert.match(kcs, /export async function importKcsVault/);
  assert.match(
    kcs,
    /requireOrganizationMembership\(user\.id, organizationId\)/
  );
  assert.match(
    exportRoute,
    /getOrganizationMembership\(user\.id, organizationId\)/
  );
  assert.match(exportRoute, /organizationNoteScope\(organizationId\)/);
  assert.match(
    importRoute,
    /getOrganizationMembership\(user\.id, organizationId\)/
  );
  assert.match(importRoute, /importKcsVault/);
});

test('V2: task and ticket filters compose access with AND', () => {
  const tasks = source('src/app/actions/tasks.ts');
  const service = source('src/lib/task-service.ts');
  const tickets = source('src/app/actions/tickets.ts');

  assert.match(tasks, /AND: \[accessWhere, filterWhere\]/);
  assert.match(service, /AND: \[accessWhere, filterWhere\]/);
  assert.match(
    tickets,
    /AND: \[accessWhere, baseFilters, mineWhere, searchWhere\]/
  );
});

test('V4/V8: migration is additive and enforces same-organization joins', () => {
  const migration = source(
    'prisma/migrations/20260820120000_organization_collaboration/migration.sql'
  );

  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  assert.match(
    migration,
    /FOREIGN KEY \("teamId", "organizationId"\) REFERENCES "Team"\("id", "organizationId"\)/
  );
  assert.match(
    migration,
    /FOREIGN KEY \("organizationId", "userId"\) REFERENCES "OrganizationMember"\("organizationId", "userId"\)/
  );
  assert.match(
    migration,
    /UPDATE "Note" SET "scopeKey" = 'user:' \|\| "userId"/
  );
});
