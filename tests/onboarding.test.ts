import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { createEmptyPortfolioContent } from '../src/lib/portfolio-content/defaults.ts';

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('Onboarding: conteúdo vazio usa identidade da conta sem template pessoal', () => {
  const content = createEmptyPortfolioContent({
    name: 'Nova Pessoa',
    username: 'nova-pessoa',
    email: 'nova@example.com',
  });
  const serialized = JSON.stringify(content);
  assert.match(serialized, /Nova Pessoa/);
  assert.match(serialized, /nova-pessoa/);
  assert.match(serialized, /nova@example\.com/);
  for (const personal of [
    'Neodoxa',
    'WakeUp',
    'Talk with my lady',
    '554797086965',
  ]) {
    assert.equal(serialized.includes(personal), false);
  }
  assert.deepEqual(content.services.services, []);
  assert.deepEqual(content.process.steps, []);
});

test('Onboarding: registerUser não cria checklist, rotina ou projetos de demonstração', () => {
  const auth = source('src/app/actions/auth.ts');
  assert.match(auth, /createEmptyPortfolioContent/);
  assert.doesNotMatch(auth, /DAILY_CHECKLIST_ITEMS/);
  assert.doesNotMatch(auth, /dailyChecklistItem\.create/);
  assert.doesNotMatch(auth, /dailyRoutine\.create/);
  assert.doesNotMatch(auth, /project\.create/);
});

test('Rotinas: migration é aditiva, preserva itens e cria snapshot histórico', () => {
  const migration = source(
    'prisma/migrations/20260821100000_daily_routines/migration.sql'
  );
  assert.match(migration, /INSERT INTO "DailyRoutine"/);
  assert.match(migration, /GROUP BY "userId"/);
  assert.match(migration, /UPDATE "DailyChecklistItem" item/);
  assert.match(migration, /"itemTitleSnapshot"/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.doesNotMatch(migration, /DROP\s+TABLE|TRUNCATE|DELETE\s+FROM/i);
});
