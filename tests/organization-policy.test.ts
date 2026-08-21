import assert from 'node:assert/strict';
import test from 'node:test';

import {
  canManageMember,
  canManageQueue,
  canManageKcs,
  canCommentKcs,
  canEditKcsComment,
  canDeleteKcsComment,
  canManageTeam,
  canViewAllTickets,
  organizationNoteScope,
  personalNoteScope,
  isPersonalTaskAssignmentValid,
  ticketStatusActivityType,
} from '../src/lib/organizations/policy.ts';

test('V3: ADMIN cannot remove, demote, or promote an OWNER', () => {
  assert.equal(canManageMember('ADMIN', 'OWNER'), false);
  assert.equal(canManageMember('ADMIN', 'OWNER', 'MEMBER'), false);
  assert.equal(canManageMember('ADMIN', 'OWNER', 'ADMIN'), false);
});

test('V3: ADMIN manages MEMBER without creating another manager', () => {
  assert.equal(canManageMember('ADMIN', 'MEMBER'), true);
  assert.equal(canManageMember('ADMIN', 'MEMBER', 'MEMBER'), true);
  assert.equal(canManageMember('ADMIN', 'MEMBER', 'ADMIN'), false);
  assert.equal(canManageMember('ADMIN', 'MEMBER', 'OWNER'), false);
});

test('V2: MEMBER cannot manage organization operation surfaces', () => {
  assert.equal(canManageTeam('MEMBER'), false);
  assert.equal(canManageQueue('MEMBER'), false);
  assert.equal(canViewAllTickets('MEMBER'), false);
  assert.equal(canManageTeam('OWNER'), true);
  assert.equal(canManageQueue('ADMIN'), true);
});

test('V16/V17: KCS content and comments are separate capabilities', () => {
  assert.equal(canManageKcs('MEMBER'), false);
  assert.equal(canManageKcs('ADMIN'), true);
  assert.equal(canManageKcs('OWNER'), true);
  assert.equal(canCommentKcs('MEMBER'), true);
  assert.equal(canEditKcsComment({ actorId: 'a', authorId: 'a' }), true);
  assert.equal(canEditKcsComment({ actorId: 'a', authorId: 'b' }), false);
  assert.equal(
    canDeleteKcsComment({ role: 'MEMBER', actorId: 'a', authorId: 'b' }),
    false
  );
  assert.equal(
    canDeleteKcsComment({ role: 'ADMIN', actorId: 'a', authorId: 'b' }),
    true
  );
});

test('V7: personal and organization note scopes never collide', () => {
  assert.equal(personalNoteScope('same-id'), 'user:same-id');
  assert.equal(organizationNoteScope('same-id'), 'organization:same-id');
  assert.notEqual(
    personalNoteScope('same-id'),
    organizationNoteScope('same-id')
  );
});

test('V5: personal task cannot target a team or another user', () => {
  assert.equal(
    isPersonalTaskAssignmentValid({ actorId: 'a', assigneeId: 'a' }),
    true
  );
  assert.equal(
    isPersonalTaskAssignmentValid({ actorId: 'a', assigneeId: 'b' }),
    false
  );
  assert.equal(
    isPersonalTaskAssignmentValid({ actorId: 'a', teamId: 'team' }),
    false
  );
});

test('V6: terminal ticket statuses produce explicit audit events', () => {
  assert.equal(ticketStatusActivityType('OPEN'), 'STATUS_CHANGED');
  assert.equal(ticketStatusActivityType('WAITING'), 'STATUS_CHANGED');
  assert.equal(ticketStatusActivityType('RESOLVED'), 'RESOLVED');
  assert.equal(ticketStatusActivityType('CLOSED'), 'CLOSED');
});
