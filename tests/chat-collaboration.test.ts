import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { validateChatAttachments } from '../src/lib/chat/attachments.ts';
import {
  canModerateMessage,
  canPinMessage,
  canViewChannel,
} from '../src/lib/organizations/policy.ts';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function bytes(...values: number[]) {
  return new Uint8Array(values);
}

test('Chat collaboration: políticas preservam privado real, DM e pins', () => {
  assert.equal(
    canViewChannel({
      role: 'OWNER',
      type: 'PRIVATE',
      isTeamMember: false,
      isChannelMember: false,
    }),
    false
  );
  assert.equal(
    canViewChannel({
      role: 'MEMBER',
      type: 'DIRECT',
      isTeamMember: false,
      isChannelMember: true,
    }),
    true
  );
  assert.equal(
    canModerateMessage({
      role: 'OWNER',
      actorId: 'owner',
      authorId: 'author',
      channelType: 'DIRECT',
    }),
    false
  );
  assert.equal(
    canPinMessage({
      role: 'MEMBER',
      type: 'DIRECT',
      isChannelMember: true,
      canManageChannel: false,
    }),
    true
  );
  assert.equal(
    canPinMessage({
      role: 'ADMIN',
      type: 'PRIVATE',
      isChannelMember: false,
      canManageChannel: false,
    }),
    false
  );
});

test('Chat attachments: PNG, JPG, PDF e TXT válidos preservam metadata', () => {
  const attachments = validateChatAttachments('org-a', 'channel-a', [
    {
      originalName: 'screen.png',
      mimeType: 'image/png',
      bytes: bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
      width: 1280,
      height: 720,
    },
    {
      originalName: 'photo.jpg',
      mimeType: 'image/jpeg',
      bytes: bytes(0xff, 0xd8, 0xff, 0xdb),
    },
    {
      originalName: 'procedure.pdf',
      mimeType: 'application/pdf',
      bytes: new TextEncoder().encode('%PDF-1.7\n'),
    },
    {
      originalName: 'debug.txt',
      mimeType: 'text/plain',
      bytes: new TextEncoder().encode('safe diagnostic output\n'),
    },
  ]);
  assert.equal(attachments.length, 4);
  assert.equal(attachments[0].mimeType, 'image/png');
  assert.equal(attachments[0].width, 1280);
  assert.equal(attachments[0].height, 720);
  assert.equal(attachments[2].extension, 'pdf');
  assert.equal(attachments[3].data.byteLength, 23);
  assert.match(attachments[0].storageKey, /^chat\/org-a\/channel-a\//);
});

test('Chat attachments: executáveis, assinatura falsa e excesso são negados', () => {
  assert.throws(
    () =>
      validateChatAttachments('org', 'channel', [
        {
          originalName: 'payload.exe',
          mimeType: 'application/octet-stream',
          bytes: bytes(0x4d, 0x5a, 0x90),
        },
      ]),
    /Formato não permitido/
  );
  assert.throws(
    () =>
      validateChatAttachments('org', 'channel', [
        {
          originalName: 'payload.txt',
          mimeType: 'text/plain',
          bytes: bytes(0x4d, 0x5a, 0x90),
        },
      ]),
    /conteúdo executável/
  );
  assert.throws(
    () =>
      validateChatAttachments('org', 'channel', [
        {
          originalName: 'fake.png',
          mimeType: 'image/png',
          bytes: new TextEncoder().encode('not a png'),
        },
      ]),
    /assinatura/
  );
  assert.throws(
    () =>
      validateChatAttachments('org', 'channel', [
        {
          originalName: 'large.txt',
          mimeType: 'text/plain',
          bytes: new Uint8Array(3 * 1024 * 1024 + 1).fill(65),
        },
      ]),
    /excede o limite/
  );
});

test('Chat attachments: download exige sessão, mensagem e conversa autorizadas', () => {
  const authorization = source('src/lib/chat/authorization.ts');
  const download = source(
    'src/app/api/chat/attachments/[attachmentId]/route.ts'
  );
  assert.match(download, /getCurrentUser/);
  assert.match(download, /getChatAttachmentAccess/);
  assert.match(download, /Cache-Control': 'private, no-store'/);
  assert.match(download, /X-Content-Type-Options': 'nosniff'/);
  assert.match(authorization, /attachment\.message\.deletedAt/);
  assert.match(authorization, /getChatChannelAccess/);
  assert.match(
    authorization,
    /access\.channel\.organizationId !== attachment\.organizationId/
  );
});

test('Chat messages: mutations compostas são idempotentes, atômicas e escopadas', () => {
  const messages = source('src/lib/chat/messages.ts');
  const actions = source('src/app/actions/chat.ts');
  const upload = source('src/app/api/chat/messages/route.ts');
  assert.match(messages, /requireChatChannelPost/);
  assert.match(
    messages,
    /access\.channel\.organizationId !== input\.organizationId/
  );
  assert.match(messages, /channelId_authorId_clientNonce/);
  assert.match(messages, /db\.\$transaction/);
  assert.match(messages, /attachments:\s*\{\s*create:/);
  assert.match(messages, /serializeChatMessagesForViewer/);
  assert.match(messages, /ticketVisibilityWhere/);
  assert.match(messages, /visibleResources/);
  assert.match(actions, /getChatMessageAccess/);
  assert.match(actions, /searchChatMessages/);
  assert.match(actions, /replyToId: null/);
  assert.match(upload, /isSameOrigin/);
  assert.match(upload, /CHAT_MAX_TOTAL_ATTACHMENT_SIZE/);
  assert.doesNotMatch(upload, /organizationId.*trust|publicUrl/i);
});

test('Chat schema: migration é aditiva e reforça tenant, reação e índices', () => {
  const migration = source(
    'prisma/migrations/20260821140000_chat_collaboration/migration.sql'
  );
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  assert.match(migration, /CREATE TABLE "ChatAttachment"/);
  assert.match(migration, /CREATE TABLE "ChatReaction"/);
  assert.match(
    migration,
    /FOREIGN KEY \("messageId", "organizationId"\) REFERENCES "ChatMessage"\("id", "organizationId"\)/
  );
  assert.match(migration, /ChatReaction_messageId_userId_emoji_key/);
  assert.match(migration, /ChatMessage_channelId_updatedAt_idx/);
  assert.match(migration, /ChatAttachment_organizationId_fileName_idx/);
});

test('Chat UX: optimistic, retry, paste, drop, scroll e sync são explícitos', () => {
  const workspace = source('src/app/admin/_tabs/chat/chat-workspace.tsx');
  const composer = source('src/app/admin/_tabs/chat/message-composer.tsx');
  const list = source('src/app/admin/_tabs/chat/message-list.tsx');
  const client = source('src/app/admin/_tabs/chat/client.ts');
  assert.match(workspace, /createPendingChatMessage/);
  assert.match(workspace, /clientStatus: 'FAILED'/);
  assert.match(workspace, /syncChatMessages/);
  assert.match(composer, /onPaste=\{handlePaste\}/);
  assert.match(composer, /onDrop=\{handleDrop\}/);
  assert.match(composer, /multiple/);
  assert.match(list, /previousHeight/);
  assert.match(list, /CHAT_SCROLL_THRESHOLD_PX/);
  assert.match(client, /request\.upload\.onprogress/);
});
