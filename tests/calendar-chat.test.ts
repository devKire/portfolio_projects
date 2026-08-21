import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  expandCalendarEvent,
  getZonedParts,
  zonedDateTimeToUtc,
} from '../src/lib/calendar/recurrence.ts';
import {
  canCreateChannel,
  canManageOrganizationEvent,
  canModerateMessage,
  canViewCalendarEvent,
  canViewChannel,
} from '../src/lib/organizations/policy.ts';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('Calendar: recorrência diária preserva 09:00 local através do DST', () => {
  const timezone = 'America/New_York';
  const startAt = zonedDateTimeToUtc(
    { year: 2026, month: 3, day: 7, hour: 9, minute: 0, second: 0 },
    timezone
  );
  const endAt = zonedDateTimeToUtc(
    { year: 2026, month: 3, day: 7, hour: 10, minute: 0, second: 0 },
    timezone
  );
  const occurrences = expandCalendarEvent(
    {
      id: 'daily',
      startAt,
      endAt,
      timezone,
      recurrenceFrequency: 'DAILY',
      recurrenceInterval: 1,
      recurrenceWeekdays: [],
      recurrenceUntil: zonedDateTimeToUtc(
        { year: 2026, month: 3, day: 10, hour: 23, minute: 0, second: 0 },
        timezone
      ),
    },
    new Date('2026-03-07T00:00:00Z'),
    new Date('2026-03-11T00:00:00Z')
  );
  assert.equal(occurrences.length, 4);
  assert.deepEqual(
    occurrences.map(
      (occurrence) => getZonedParts(occurrence.occurrenceStartAt, timezone).hour
    ),
    [9, 9, 9, 9]
  );
  assert.equal(
    occurrences[1].occurrenceStartAt.getTime() -
      occurrences[0].occurrenceStartAt.getTime(),
    23 * 60 * 60 * 1000
  );
});

test('Calendar: políticas não promovem convidado a editor e isolam eventos pessoais', () => {
  assert.equal(
    canViewCalendarEvent({
      actorId: 'b',
      creatorId: 'a',
      organizationRole: null,
      visibility: 'INVITE_ONLY',
      isParticipant: false,
      isTeamMember: false,
    }),
    false
  );
  assert.equal(
    canViewCalendarEvent({
      actorId: 'b',
      creatorId: 'a',
      organizationRole: null,
      visibility: 'INVITE_ONLY',
      isParticipant: true,
      isTeamMember: false,
    }),
    true
  );
  assert.equal(
    canManageOrganizationEvent({
      role: 'MEMBER',
      actorId: 'b',
      creatorId: 'a',
    }),
    false
  );
  assert.equal(
    canManageOrganizationEvent({
      role: 'ADMIN',
      actorId: 'b',
      creatorId: 'a',
    }),
    true
  );
});

test('Chat: canal privado e equipe exigem membership real', () => {
  assert.equal(canCreateChannel('MEMBER'), false);
  assert.equal(canCreateChannel('ADMIN'), true);
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
      type: 'TEAM',
      isTeamMember: false,
      isChannelMember: false,
    }),
    false
  );
  assert.equal(
    canViewChannel({
      role: 'MEMBER',
      type: 'TEAM',
      isTeamMember: true,
      isChannelMember: false,
    }),
    true
  );
  assert.equal(
    canModerateMessage({ role: 'MEMBER', actorId: 'a', authorId: 'b' }),
    false
  );
  assert.equal(
    canModerateMessage({ role: 'ADMIN', actorId: 'a', authorId: 'b' }),
    true
  );
});

test('Calendar: actions validam organização, equipe, participantes e autorização de update', () => {
  const action = source('src/app/actions/calendar.ts');
  const authorization = source('src/lib/calendar/authorization.ts');
  assert.match(action, /validateParticipants/);
  assert.match(action, /validateOrganizationTargets/);
  assert.match(action, /validateWorkLinks/);
  assert.match(action, /requireCalendarEventManage/);
  assert.match(action, /organizationId !== access\.event\.organizationId/);
  assert.match(authorization, /canViewCalendarEvent/);
  assert.match(authorization, /canManageOrganizationEvent/);
});

test('Chat: actions escopam channel/message por organização e bloqueiam thread recursiva', () => {
  const action = source('src/app/actions/chat.ts');
  const authorization = source('src/lib/chat/authorization.ts');
  assert.match(action, /requireChatChannelPost/);
  assert.match(
    action,
    /access\.channel\.organizationId !== input\.organizationId/
  );
  assert.match(action, /replyToId: null/);
  assert.match(action, /requireChatMessageModeration/);
  assert.match(action, /message\.authorId !== user\.id/);
  assert.match(authorization, /canViewChannel/);
  assert.match(authorization, /organizationId: channel\.organizationId/);
});

test('Calendar/Chat: migrations são aditivas e reforçam joins do mesmo tenant', () => {
  const calendar = source(
    'prisma/migrations/20260821110000_calendar/migration.sql'
  );
  const chat = source('prisma/migrations/20260821120000_chat/migration.sql');
  assert.match(
    calendar,
    /FOREIGN KEY \("eventId", "organizationId"\) REFERENCES "CalendarEvent"\("id", "organizationId"\)/
  );
  assert.match(
    chat,
    /FOREIGN KEY \("channelId", "organizationId"\) REFERENCES "ChatChannel"\("id", "organizationId"\)/
  );
  assert.match(chat, /"lastReadAt"/);
  assert.doesNotMatch(calendar, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
  assert.doesNotMatch(chat, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});
