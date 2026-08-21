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

import {
  planKnowledgeFolderTree,
  relativeKnowledgePath,
  resolveKnowledgeReferencePath,
  rewriteResolvedKnowledgeReferences,
  safeKnowledgeTransferRelativePath,
} from '../src/lib/knowledge/transfer-planning.ts';

test('KCS: referências relativas com ponto e parent directory resolvem o attachment real', () => {
  assert.equal(
    resolveKnowledgeReferencePath('Docs/Sub', '../assets/server.png'),
    'Docs/assets/server.png'
  );
  assert.equal(
    resolveKnowledgeReferencePath('Docs/Sub', './assets/server.png'),
    'Docs/Sub/assets/server.png'
  );
  assert.equal(
    safeKnowledgeTransferRelativePath('../assets/server.png', 'server.png'),
    'assets/server.png'
  );
  assert.equal(
    relativeKnowledgePath('KCS/Docs/Sub', 'KCS/Docs/assets/server-2.png'),
    '../assets/server-2.png'
  );
});

test('KCS: colisão de attachment reescreve Markdown e embed wiki para o novo caminho', () => {
  const content = [
    '![Servidor](../assets/server.png)',
    '![[../assets/server.png]]',
  ].join('\n');
  assert.equal(
    rewriteResolvedKnowledgeReferences(content, 'Docs/Sub', 'KCS/Docs/Sub', [
      {
        fromPath: 'Docs/assets/server.png',
        toPath: 'KCS/Docs/assets/server-2.png',
      },
    ]),
    ['![Servidor](../assets/server-2.png)', '![[../assets/server-2.png]]'].join(
      '\n'
    )
  );
});

test('KCS: árvore transferida mantém parentId e posição relativa sob colisão da raiz', () => {
  const plans = planKnowledgeFolderTree({
    rootId: 'infra',
    destination: { id: 'docs', path: 'Documentação' },
    usedPaths: new Set(['Documentação/Infraestrutura']),
    folders: [
      {
        id: 'linux',
        name: 'Linux',
        path: 'Infraestrutura/Servidores/Linux',
        parentId: 'servers',
      },
      {
        id: 'infra',
        name: 'Infraestrutura',
        path: 'Infraestrutura',
        parentId: null,
      },
      {
        id: 'servers',
        name: 'Servidores',
        path: 'Infraestrutura/Servidores',
        parentId: 'infra',
      },
    ],
  });
  assert.deepEqual(
    plans.map(({ id, path, parentId }) => ({ id, path, parentId })),
    [
      {
        id: 'infra',
        path: 'Documentação/Infraestrutura-2',
        parentId: 'docs',
      },
      {
        id: 'servers',
        path: 'Documentação/Infraestrutura-2/Servidores',
        parentId: 'infra',
      },
      {
        id: 'linux',
        path: 'Documentação/Infraestrutura-2/Servidores/Linux',
        parentId: 'servers',
      },
    ]
  );
});
