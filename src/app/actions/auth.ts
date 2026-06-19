'use server';

import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

import { DAILY_CHECKLIST_ITEMS } from '@/lib/daily-checklist-items';
import {
  createSession,
  deleteCurrentSession,
  getCurrentUser,
} from '@/lib/auth/session';
import {
  normalizeEmail,
  normalizeUsername,
  validateEmail,
  validatePassword,
  validateUsername,
} from '@/lib/auth/validation';
import { DEFAULT_PORTFOLIO_CONTENT } from '@/lib/portfolio-content/defaults';
import { db } from '@/lib/prisma';

type AuthResult =
  | {
      success: true;
      user: {
        id: string;
        name: string | null;
        username: string;
        email: string;
      };
    }
  | { success: false; error: string };

function toJson(value: unknown) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function publicUser(user: {
  id: string;
  name: string | null;
  username: string;
  email: string;
}) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
  };
}

export async function loginUser(formData: FormData): Promise<AuthResult> {
  try {
    const identifier = normalizeEmail(
      String(formData.get('identifier') || formData.get('username') || '')
    );
    const password = String(formData.get('password') || '');

    if (!identifier || !password) {
      return { success: false, error: 'Informe usuário/email e senha.' };
    }

    const user = await db.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: normalizeUsername(identifier) },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { success: false, error: 'Credenciais inválidas.' };
    }

    await createSession(user.id);
    return { success: true, user: publicUser(user) };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Não foi possível entrar agora.' };
  }
}

export async function registerUser(formData: FormData): Promise<AuthResult> {
  try {
    const name = String(formData.get('name') || '').trim();
    const username = normalizeUsername(String(formData.get('username') || ''));
    const email = normalizeEmail(String(formData.get('email') || ''));
    const password = String(formData.get('password') || '');
    const passwordConfirmation = String(
      formData.get('passwordConfirmation') || ''
    );

    if (name.length < 2 || name.length > 80) {
      return {
        success: false,
        error: 'Nome deve ter entre 2 e 80 caracteres.',
      };
    }

    const usernameError = validateUsername(username);
    if (usernameError) return { success: false, error: usernameError };

    const emailError = validateEmail(email);
    if (emailError) return { success: false, error: emailError };

    const passwordError = validatePassword(password);
    if (passwordError) return { success: false, error: passwordError };

    if (password !== passwordConfirmation) {
      return { success: false, error: 'Confirmação de senha não confere.' };
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await db.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name,
          username,
          email,
          passwordHash,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
        },
      });

      const landingpage = await tx.landingPage.create({
        data: {
          userId: createdUser.id,
          name,
          slug: username,
          description: `Portfólio de ${name}`,
          avatarImageUrl: '',
          coverImageUrl: '',
        },
      });

      await Promise.all([
        tx.contactInfo.create({
          data: {
            landingpageId: landingpage.id,
            email,
          },
        }),
        tx.portfolioContent.create({
          data: {
            landingpageId: landingpage.id,
            hero: toJson(DEFAULT_PORTFOLIO_CONTENT.hero),
            about: toJson(DEFAULT_PORTFOLIO_CONTENT.about),
            services: toJson(DEFAULT_PORTFOLIO_CONTENT.services),
            process: toJson(DEFAULT_PORTFOLIO_CONTENT.process),
            contact: toJson(DEFAULT_PORTFOLIO_CONTENT.contact),
            projects: toJson(DEFAULT_PORTFOLIO_CONTENT.projects),
            settings: toJson(DEFAULT_PORTFOLIO_CONTENT.settings),
          },
        }),
        tx.dailyChecklistItem.createMany({
          data: DAILY_CHECKLIST_ITEMS.map((item) => ({
            userId: createdUser.id,
            slug: item.slug,
            title: item.title,
            description: item.description,
            period: item.period,
            timeRange: item.timeRange,
            startTime: item.startTime,
            endTime: item.endTime,
            position: item.position,
            isSacred: item.isSacred || false,
          })),
        }),
      ]);

      return createdUser;
    });

    await createSession(user.id);
    return { success: true, user: publicUser(user) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(',')
        : String(error.meta?.target || '');

      if (target.includes('username')) {
        return { success: false, error: 'Username já cadastrado.' };
      }
      if (target.includes('email')) {
        return { success: false, error: 'Email já cadastrado.' };
      }
      if (target.includes('slug')) {
        return { success: false, error: 'Slug público indisponível.' };
      }
    }

    console.error('Registration error:', error);
    return { success: false, error: 'Não foi possível criar a conta.' };
  }
}

export async function logoutUser() {
  await deleteCurrentSession();
  return { success: true };
}

export async function checkAuth() {
  const user = await getCurrentUser();
  return {
    authenticated: Boolean(user),
    user: user ? publicUser(user) : null,
  };
}

// Compatibility aliases while old imports are removed.
export async function loginAdmin(formData: FormData) {
  return loginUser(formData);
}

export async function logoutAdmin() {
  return logoutUser();
}
