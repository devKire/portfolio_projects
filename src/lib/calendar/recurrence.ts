import type { CalendarRecurrenceFrequency } from '@prisma/client';

export type CalendarRecurrenceSource = {
  id: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  recurrenceFrequency: CalendarRecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceWeekdays: number[];
  recurrenceUntil: Date | null;
};

export type CalendarOccurrence<T extends CalendarRecurrenceSource> = T & {
  occurrenceKey: string;
  occurrenceStartAt: Date;
  occurrenceEndAt: Date;
};

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function isValidTimeZone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

export function getZonedParts(date: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

export function zonedDateTimeToUtc(parts: ZonedParts, timezone: string) {
  let timestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = getZonedParts(new Date(timestamp), timezone);
    const desiredUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
    const currentUtc = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second
    );
    const difference = desiredUtc - currentUtc;
    if (!difference) break;
    timestamp += difference;
  }
  return new Date(timestamp);
}

function dateOnly(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>) {
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function addCalendarDays(parts: ZonedParts, days: number): ZonedParts {
  const date = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day + days,
      parts.hour,
      parts.minute,
      parts.second
    )
  );
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
  };
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekday(parts: Pick<ZonedParts, 'year' | 'month' | 'day'>) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function occursOnDate(
  source: CalendarRecurrenceSource,
  base: ZonedParts,
  candidate: ZonedParts
) {
  const dayDifference = Math.round(
    (dateOnly(candidate) - dateOnly(base)) / 86_400_000
  );
  if (dayDifference < 0) return false;
  const interval = Math.max(1, source.recurrenceInterval);
  if (source.recurrenceFrequency === 'DAILY') {
    return dayDifference % interval === 0;
  }
  if (source.recurrenceFrequency === 'WEEKLY') {
    const weekdays = source.recurrenceWeekdays.length
      ? source.recurrenceWeekdays
      : [weekday(base)];
    return (
      Math.floor(dayDifference / 7) % interval === 0 &&
      weekdays.includes(weekday(candidate))
    );
  }
  if (source.recurrenceFrequency === 'MONTHLY') {
    const monthDifference =
      (candidate.year - base.year) * 12 + candidate.month - base.month;
    const targetDay = Math.min(
      base.day,
      daysInMonth(candidate.year, candidate.month)
    );
    return (
      monthDifference >= 0 &&
      monthDifference % interval === 0 &&
      candidate.day === targetDay
    );
  }
  return dayDifference === 0;
}

export function expandCalendarEvent<T extends CalendarRecurrenceSource>(
  source: T,
  rangeStart: Date,
  rangeEnd: Date
): CalendarOccurrence<T>[] {
  if (source.endAt <= rangeStart || source.startAt >= rangeEnd) {
    if (source.recurrenceFrequency === 'NONE') return [];
  }
  if (source.recurrenceFrequency === 'NONE') {
    return [
      {
        ...source,
        occurrenceKey: source.id,
        occurrenceStartAt: source.startAt,
        occurrenceEndAt: source.endAt,
      },
    ].filter(
      (occurrence) =>
        occurrence.occurrenceStartAt < rangeEnd &&
        occurrence.occurrenceEndAt > rangeStart
    );
  }

  const baseStart = getZonedParts(source.startAt, source.timezone);
  const baseEnd = getZonedParts(source.endAt, source.timezone);
  const endDayOffset = Math.round(
    (dateOnly(baseEnd) - dateOnly(baseStart)) / 86_400_000
  );
  const rangeStartLocal = getZonedParts(rangeStart, source.timezone);
  const rangeEndLocal = getZonedParts(rangeEnd, source.timezone);
  const firstOffset = Math.max(
    0,
    Math.floor((dateOnly(rangeStartLocal) - dateOnly(baseStart)) / 86_400_000) -
      1
  );
  let candidate = addCalendarDays(baseStart, firstOffset);
  const lastDate = dateOnly(addCalendarDays(rangeEndLocal, 1));
  const occurrences: CalendarOccurrence<T>[] = [];

  while (dateOnly(candidate) <= lastDate && occurrences.length < 1000) {
    if (occursOnDate(source, baseStart, candidate)) {
      const occurrenceStartAt = zonedDateTimeToUtc(
        {
          ...candidate,
          hour: baseStart.hour,
          minute: baseStart.minute,
          second: baseStart.second,
        },
        source.timezone
      );
      if (
        !source.recurrenceUntil ||
        occurrenceStartAt <= source.recurrenceUntil
      ) {
        const endDate = addCalendarDays(candidate, endDayOffset);
        const occurrenceEndAt = zonedDateTimeToUtc(
          {
            ...endDate,
            hour: baseEnd.hour,
            minute: baseEnd.minute,
            second: baseEnd.second,
          },
          source.timezone
        );
        if (occurrenceStartAt < rangeEnd && occurrenceEndAt > rangeStart) {
          occurrences.push({
            ...source,
            occurrenceKey: `${source.id}:${occurrenceStartAt.toISOString()}`,
            occurrenceStartAt,
            occurrenceEndAt,
          });
        }
      }
    }
    candidate = addCalendarDays(candidate, 1);
  }
  return occurrences;
}
