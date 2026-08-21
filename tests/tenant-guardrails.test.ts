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
    /requireOrganizationMembership\(\s*user\.id,\s*organizationId\s*\)/
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
    /requireOrganizationMembership\(\s*user\.id,\s*organizationId\s*\)/
  );
  assert.match(
    exportRoute,
    /getOrganizationMembership\(user\.id, organizationId\)/
  );
  assert.match(exportRoute, /organizationNoteScope\(organizationId\)/);
  assert.match(
    importRoute,
    /getOrganizationMembership\(\s*user\.id,\s*organizationId\s*\)/
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

test('V16: shared Markdown preview makes task mutation an explicit capability', () => {
  const preview = source('src/app/admin/_tabs/Notes/MarkdownPreview.tsx');
  const editor = source('src/app/admin/_tabs/Notes/KnowledgeNoteEditor.tsx');

  assert.match(preview, /onToggleTask\?: \(lineIndex: number\) => void/);
  assert.match(preview, /disabled=\{!onToggleTask\}/);
  assert.match(editor, /readOnly \? undefined : onToggleTask/);
});

test('V16/V18: KCS writes and transfers enforce server-side scope', () => {
  const kcs = source('src/app/actions/kcs.ts');
  const transfer = source('src/app/actions/knowledge.ts');

  assert.match(kcs, /requireKcsManager/);
  assert.match(transfer, /runTransferTransaction/);
  assert.match(transfer, /TransactionIsolationLevel\.Serializable/);
  assert.match(transfer, /requireTransferMembership/);
  assert.match(transfer, /where: \{ id: input\.noteId, \.\.\.sourceScope \}/);
  assert.match(transfer, /requireDestinationFolder/);
  assert.match(transfer, /data: \{ noteId: null, noteTaskKey: null \}/);
});

test('V17/V25: KCS comments use membership and same-organization relation', () => {
  const comments = source('src/app/actions/note-comments.ts');
  const migration = source(
    'prisma/migrations/20260820160000_kcs_note_comments/migration.sql'
  );

  assert.match(comments, /requireKcsNoteAccess/);
  assert.match(comments, /canEditKcsComment/);
  assert.match(comments, /canDeleteKcsComment/);
  assert.match(
    migration,
    /FOREIGN KEY \("noteId", "organizationId"\) REFERENCES "Note"\("id", "organizationId"\)/
  );
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});

test('V22/V24: navigation exposes one Work entry and adapter suppresses links', () => {
  const navigation = source('src/app/admin/_config/navigation.ts');
  const router = source('src/app/admin/_components/ContentRouter.tsx');
  const adapter = source('src/lib/work/adapter.ts');

  assert.match(navigation, /id: 'work', label: 'Trabalho'/);
  assert.doesNotMatch(navigation, /id: 'tasks'/);
  assert.doesNotMatch(navigation, /id: 'tickets'/);
  assert.match(router, /case 'work'/);
  assert.match(adapter, /canonicalTaskIds/);
  assert.match(adapter, /!canonicalTaskIds\.has\(task\.id\)/);
});
