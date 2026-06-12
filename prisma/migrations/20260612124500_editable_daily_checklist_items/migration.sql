ALTER TABLE "DailyChecklistItem"
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT,
ADD COLUMN "isSacred" BOOLEAN NOT NULL DEFAULT false;

UPDATE "DailyChecklistItem" SET "startTime" = '7h', "endTime" = '8h' WHERE "slug" = 'wakeup';
UPDATE "DailyChecklistItem" SET "startTime" = '8h', "endTime" = '9h' WHERE "slug" = 'pray-morning';
UPDATE "DailyChecklistItem" SET "startTime" = '9h', "endTime" = '9h30' WHERE "slug" = 'setup-fechado';
UPDATE "DailyChecklistItem" SET "startTime" = '9h30', "endTime" = '10h' WHERE "slug" = 'deep-work-leve';
UPDATE "DailyChecklistItem" SET "startTime" = '10h', "endTime" = '10h30' WHERE "slug" = 'breakfast';
UPDATE "DailyChecklistItem" SET "startTime" = '10h30', "endTime" = '12h' WHERE "slug" = 'portfolio';
UPDATE "DailyChecklistItem" SET "startTime" = '12h', "endTime" = '13h' WHERE "slug" = 'foco-secundario';
UPDATE "DailyChecklistItem" SET "startTime" = '13h', "endTime" = '14h' WHERE "slug" = 'lunch';
UPDATE "DailyChecklistItem" SET "startTime" = '14h', "endTime" = '15h' WHERE "slug" = 'disparo-emails';
UPDATE "DailyChecklistItem" SET "startTime" = '15h', "endTime" = '17h' WHERE "slug" = 'neodoxa';
UPDATE "DailyChecklistItem" SET "startTime" = '17h', "endTime" = '18h' WHERE "slug" = 'publicacoes-divulgacoes';
UPDATE "DailyChecklistItem" SET "startTime" = '18h', "endTime" = '19h' WHERE "slug" = 'coffee-fechamento';
UPDATE "DailyChecklistItem" SET "startTime" = '19h', "endTime" = '21h' WHERE "slug" = 'church-reading-guitar';
UPDATE "DailyChecklistItem" SET "startTime" = '21h', "endTime" = '22h' WHERE "slug" = 'talk-with-my-lady';
UPDATE "DailyChecklistItem" SET "startTime" = '22h', "endTime" = '23h' WHERE "slug" = 'pray-sleep';

UPDATE "DailyChecklistItem" SET "isSacred" = true WHERE "slug" IN ('portfolio', 'neodoxa');
