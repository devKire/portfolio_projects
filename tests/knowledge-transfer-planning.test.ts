import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractAttachmentReferences,
  replaceKnowledgePathPrefix,
  reserveUniqueFilePath,
  reserveUniqueFolderPath,
  reserveUniqueSlug,
  rewriteKnowledgeReference,
} from '../src/lib/knowledge/transfer-planning.ts';

test('V19: collisions receive deterministic suffixes without overwriting', () => {
  assert.equal(reserveUniqueSlug('vpn', new Set(['vpn', 'vpn-2'])), 'vpn-3');
  assert.equal(
    reserveUniqueFilePath(
      'Infra/VPN.md',
      new Set(['Infra/VPN.md', 'Infra/VPN-2.md'])
    ),
    'Infra/VPN-3.md'
  );
  assert.equal(
    reserveUniqueFolderPath(
      'Infra/Docker',
      new Set(['Infra/Docker', 'Infra/Docker-2'])
    ),
    'Infra/Docker-3'
  );
});

test('V19: descendants keep their relative folder structure', () => {
  assert.equal(
    replaceKnowledgePathPrefix(
      'Documentação Docker/Swarm/Nodes',
      'Documentação Docker',
      'Infra/Documentação Docker'
    ),
    'Infra/Documentação Docker/Swarm/Nodes'
  );
});

test('V20: attachment extraction and rewrites preserve Markdown forms', () => {
  const content = [
    '![[assets/diagrama.png]]',
    '[manual](docs/manual.pdf)',
    '[malformado](docs/%E0%A4%A.pdf)',
    '[externo](https://example.com/a.pdf)',
  ].join('\n');
  assert.deepEqual(extractAttachmentReferences(content), [
    'assets/diagrama.png',
    'docs/manual.pdf',
    'docs/%E0%A4%A.pdf',
  ]);
  assert.equal(
    rewriteKnowledgeReference(
      '![[assets/diagrama.png]]\n[manual](docs/manual.pdf)',
      ['assets/diagrama.png'],
      'assets/diagrama-2.png'
    ),
    '![[assets/diagrama-2.png]]\n[manual](docs/manual.pdf)'
  );
});
