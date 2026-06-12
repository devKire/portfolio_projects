import type { Prisma } from '@prisma/client';

import { DEFAULT_PORTFOLIO_CONTENT } from './defaults';
import type { PortfolioContentData, PortfolioSectionKey } from './types';

type PlainObject = Record<string, unknown>;

const isPlainObject = (value: unknown): value is PlainObject =>
  Boolean(value) &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !(value instanceof Date);

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function deepMergeWithDefaults<T>(defaults: T, value: unknown): T {
  if (Array.isArray(defaults)) {
    return Array.isArray(value) ? (value as T) : clone(defaults);
  }

  if (isPlainObject(defaults)) {
    const output: PlainObject = { ...defaults };
    const source = isPlainObject(value) ? value : {};

    for (const key of Object.keys(defaults)) {
      output[key] = deepMergeWithDefaults(
        (defaults as PlainObject)[key],
        source[key]
      );
    }

    for (const [key, sourceValue] of Object.entries(source)) {
      if (!(key in output)) output[key] = sourceValue;
    }

    return output as T;
  }

  return value === undefined || value === null ? defaults : (value as T);
}

export function resolvePortfolioContent(
  content?: Partial<Record<PortfolioSectionKey, Prisma.JsonValue | null>> | null
): PortfolioContentData {
  return {
    hero: deepMergeWithDefaults(DEFAULT_PORTFOLIO_CONTENT.hero, content?.hero),
    about: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.about,
      content?.about
    ),
    services: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.services,
      content?.services
    ),
    process: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.process,
      content?.process
    ),
    contact: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.contact,
      content?.contact
    ),
    projects: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.projects,
      (content as { projects?: Prisma.JsonValue | null } | null)?.projects
    ),
    settings: deepMergeWithDefaults(
      DEFAULT_PORTFOLIO_CONTENT.settings,
      content?.settings
    ),
  };
}

export function resolvePortfolioSection<K extends PortfolioSectionKey>(
  section: K,
  value: unknown
): PortfolioContentData[K] {
  return deepMergeWithDefaults(DEFAULT_PORTFOLIO_CONTENT[section], value);
}
