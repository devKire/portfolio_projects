import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('KCS: nota e attachments são atualizados dentro da mesma transação serializável', () => {
  const action = source('src/app/actions/knowledge.ts');
  assert.match(action, /runTransferTransaction\(async \(tx\) =>/);
  assert.match(action, /TransactionIsolationLevel\.Serializable/);
  assert.match(action, /tx\.noteAttachment\.update/);
  assert.match(action, /tx\.note\.update/);
  assert.match(action, /rewriteResolvedKnowledgeReferences/);
});

test('KCS: folder transfere attachments de toda a árvore no escopo pessoal autorizado', () => {
  const action = source('src/app/actions/knowledge.ts');
  assert.match(action, /where: \{ id: input\.folderId, \.\.\.sourceScope/);
  assert.match(action, /\{ folderPath: root\.path \}/);
  assert.match(
    action,
    /\{ folderPath: \{ startsWith: `\$\{root\.path\}\/` \} \}/
  );
  assert.match(action, /parentId: target\.parentId/);
  assert.doesNotMatch(action, /reusedSourceIds/);
});

test('KCS: update preserva dataUrl, mimeType, size e extension existentes', () => {
  const action = source('src/app/actions/knowledge.ts');
  const schema = source('prisma/schema.prisma');
  assert.match(schema, /dataUrl\s+String\?\s+@db\.Text/);
  assert.match(schema, /mimeType\s+String\?/);
  assert.match(schema, /size\s+Int\?/);
  assert.match(schema, /extension\s+String\?/);
  assert.doesNotMatch(action, /dataUrl:\s*null/);
  assert.doesNotMatch(action, /mimeType:\s*null/);
  assert.doesNotMatch(action, /size:\s*null/);
  assert.doesNotMatch(action, /extension:\s*null/);
});
