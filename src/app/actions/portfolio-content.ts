'use server';

import { revalidatePath } from 'next/cache';
import type { Prisma } from '@prisma/client';

import { db } from '@/lib/prisma';
import { DEFAULT_PORTFOLIO_CONTENT } from '@/lib/portfolio-content/defaults';
import {
  deepMergeWithDefaults,
  resolvePortfolioContent,
  resolvePortfolioSection,
} from '@/lib/portfolio-content/merge';
import type {
  PortfolioContentData,
  PortfolioSectionKey,
} from '@/lib/portfolio-content/types';

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type LandingPageInfoInput = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  avatarImageUrl: string;
  coverImageUrl: string;
};

export type ContactInfoInput = {
  landingpageId?: string;
  email: string;
  phone?: string;
  whatsappLink?: string;
  instagramLink?: string;
  facebookLink?: string;
  linkedinLink?: string;
};

const sectionKeys: PortfolioSectionKey[] = [
  'hero',
  'about',
  'services',
  'process',
  'contact',
  'projects',
  'settings',
];

async function getDefaultLandingPageId(landingpageId?: string) {
  if (landingpageId) return landingpageId;

  const landingpage = await db.landingPage.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (!landingpage) {
    throw new Error('Nenhuma landing page encontrada.');
  }

  return landingpage.id;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toJsonObject(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function getPublicPaths(slug?: string) {
  return ['/', slug ? `/${slug}` : null].filter(Boolean) as string[];
}

function revalidatePortfolio(slug?: string) {
  revalidatePath('/admin');
  for (const path of getPublicPaths(slug)) {
    revalidatePath(path);
  }
}

export async function getPortfolioContent(landingpageId?: string): Promise<
  ActionResult<{
    landingpage: LandingPageInfoInput;
    contactInfo: ContactInfoInput | null;
    content: PortfolioContentData;
  }>
> {
  try {
    const resolvedLandingpageId = await getDefaultLandingPageId(landingpageId);
    const landingpage = await db.landingPage.findUnique({
      where: { id: resolvedLandingpageId },
      include: {
        contactInfo: true,
        portfolioContent: true,
      },
    });

    if (!landingpage) {
      return { success: false, error: 'Landing page não encontrada.' };
    }

    return {
      success: true,
      data: {
        landingpage: {
          id: landingpage.id,
          name: landingpage.name,
          slug: landingpage.slug,
          description: landingpage.description,
          avatarImageUrl: landingpage.avatarImageUrl,
          coverImageUrl: landingpage.coverImageUrl,
        },
        contactInfo: landingpage.contactInfo
          ? {
              landingpageId: landingpage.id,
              email: landingpage.contactInfo.email,
              phone: landingpage.contactInfo.phone || '',
              whatsappLink: landingpage.contactInfo.whatsappLink || '',
              instagramLink: landingpage.contactInfo.instagramLink || '',
              facebookLink: landingpage.contactInfo.facebookLink || '',
              linkedinLink: landingpage.contactInfo.linkedinLink || '',
            }
          : null,
        content: resolvePortfolioContent(landingpage.portfolioContent),
      },
    };
  } catch (error) {
    console.error('Error fetching portfolio content:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar o CMS.',
    };
  }
}

export async function upsertPortfolioContent(
  landingpageId: string | undefined,
  content: Partial<PortfolioContentData>
): Promise<ActionResult<PortfolioContentData>> {
  try {
    const resolvedLandingpageId = await getDefaultLandingPageId(landingpageId);
    const landingpage = await db.landingPage.findUnique({
      where: { id: resolvedLandingpageId },
      include: { portfolioContent: true },
    });

    if (!landingpage) {
      return { success: false, error: 'Landing page não encontrada.' };
    }

    const current = resolvePortfolioContent(landingpage.portfolioContent);
    const merged = deepMergeWithDefaults(current, content);

    await db.portfolioContent.upsert({
      where: { landingpageId: resolvedLandingpageId },
      create: {
        landingpageId: resolvedLandingpageId,
        hero: toJsonObject(merged.hero),
        about: toJsonObject(merged.about),
        services: toJsonObject(merged.services),
        process: toJsonObject(merged.process),
        contact: toJsonObject(merged.contact),
        projects: toJsonObject(merged.projects),
        settings: toJsonObject(merged.settings),
      },
      update: {
        hero: toJsonObject(merged.hero),
        about: toJsonObject(merged.about),
        services: toJsonObject(merged.services),
        process: toJsonObject(merged.process),
        contact: toJsonObject(merged.contact),
        projects: toJsonObject(merged.projects),
        settings: toJsonObject(merged.settings),
      },
    });

    revalidatePortfolio(landingpage.slug);
    return { success: true, data: merged };
  } catch (error) {
    console.error('Error upserting portfolio content:', error);
    return { success: false, error: 'Não foi possível salvar o conteúdo.' };
  }
}

export async function updatePortfolioSection(
  landingpageId: string | undefined,
  section: PortfolioSectionKey,
  value: Partial<PortfolioContentData[PortfolioSectionKey]>
): Promise<ActionResult<PortfolioContentData[PortfolioSectionKey]>> {
  try {
    if (!sectionKeys.includes(section)) {
      return { success: false, error: 'Seção inválida.' };
    }

    if (!isObject(value)) {
      return { success: false, error: 'Conteúdo inválido.' };
    }

    const resolvedLandingpageId = await getDefaultLandingPageId(landingpageId);
    const landingpage = await db.landingPage.findUnique({
      where: { id: resolvedLandingpageId },
      include: { portfolioContent: true },
    });

    if (!landingpage) {
      return { success: false, error: 'Landing page não encontrada.' };
    }

    const current = resolvePortfolioContent(landingpage.portfolioContent);
    const mergedSection = resolvePortfolioSection(
      section,
      deepMergeWithDefaults(current[section], value)
    );

    await db.portfolioContent.upsert({
      where: { landingpageId: resolvedLandingpageId },
      create: {
        landingpageId: resolvedLandingpageId,
        hero: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.hero),
        about: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.about),
        services: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.services),
        process: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.process),
        contact: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.contact),
        projects: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.projects),
        settings: toJsonObject(DEFAULT_PORTFOLIO_CONTENT.settings),
        [section]: toJsonObject(mergedSection),
      },
      update: {
        [section]: toJsonObject(mergedSection),
      },
    });

    revalidatePortfolio(landingpage.slug);
    return { success: true, data: mergedSection };
  } catch (error) {
    console.error('Error updating portfolio section:', error);
    return { success: false, error: 'Não foi possível salvar a seção.' };
  }
}

export async function updateLandingPageInfo(
  data: LandingPageInfoInput
): Promise<ActionResult<LandingPageInfoInput>> {
  try {
    const landingpageId = await getDefaultLandingPageId(data.id);
    const name = data.name.trim();
    const slug = data.slug.trim();
    const description = data.description.trim();

    if (!name || !slug || !description) {
      return {
        success: false,
        error: 'Nome, slug e descrição são obrigatórios.',
      };
    }

    const updated = await db.landingPage.update({
      where: { id: landingpageId },
      data: {
        name,
        slug,
        description,
        avatarImageUrl: data.avatarImageUrl.trim(),
        coverImageUrl: data.coverImageUrl.trim(),
      },
    });

    revalidatePortfolio(updated.slug);
    return {
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        description: updated.description,
        avatarImageUrl: updated.avatarImageUrl,
        coverImageUrl: updated.coverImageUrl,
      },
    };
  } catch (error) {
    console.error('Error updating landing page info:', error);
    return {
      success: false,
      error: 'Não foi possível salvar os dados gerais.',
    };
  }
}

export async function updateContactInfo(
  data: ContactInfoInput
): Promise<ActionResult<ContactInfoInput>> {
  try {
    const landingpageId = await getDefaultLandingPageId(data.landingpageId);
    const email = data.email.trim();

    if (!email || !email.includes('@')) {
      return { success: false, error: 'Informe um email válido.' };
    }

    const contactInfo = await db.contactInfo.upsert({
      where: { landingpageId },
      create: {
        landingpageId,
        email,
        phone: data.phone?.trim() || null,
        whatsappLink: data.whatsappLink?.trim() || null,
        instagramLink: data.instagramLink?.trim() || null,
        facebookLink: data.facebookLink?.trim() || null,
        linkedinLink: data.linkedinLink?.trim() || null,
      },
      update: {
        email,
        phone: data.phone?.trim() || null,
        whatsappLink: data.whatsappLink?.trim() || null,
        instagramLink: data.instagramLink?.trim() || null,
        facebookLink: data.facebookLink?.trim() || null,
        linkedinLink: data.linkedinLink?.trim() || null,
      },
      include: { landingpage: { select: { slug: true } } },
    });

    revalidatePortfolio(contactInfo.landingpage.slug);
    return {
      success: true,
      data: {
        landingpageId,
        email: contactInfo.email,
        phone: contactInfo.phone || '',
        whatsappLink: contactInfo.whatsappLink || '',
        instagramLink: contactInfo.instagramLink || '',
        facebookLink: contactInfo.facebookLink || '',
        linkedinLink: contactInfo.linkedinLink || '',
      },
    };
  } catch (error) {
    console.error('Error updating contact info:', error);
    return { success: false, error: 'Não foi possível salvar o contato.' };
  }
}

export async function resetPortfolioSectionToDefault(
  landingpageId: string | undefined,
  section: PortfolioSectionKey
): Promise<ActionResult<PortfolioContentData[PortfolioSectionKey]>> {
  return updatePortfolioSection(landingpageId, section, {
    ...(DEFAULT_PORTFOLIO_CONTENT[section] as object),
  } as Partial<PortfolioContentData[PortfolioSectionKey]>);
}

export async function resetAllPortfolioContentToDefault(
  landingpageId?: string
): Promise<ActionResult<PortfolioContentData>> {
  return upsertPortfolioContent(landingpageId, DEFAULT_PORTFOLIO_CONTENT);
}
