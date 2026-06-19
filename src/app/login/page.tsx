import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import LoginForm from './LoginForm';

export const metadata: Metadata = {
  title: 'Entrar | Portfolio Workspace',
  description: 'Acesse seu painel de portfólio.',
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin');
  return <LoginForm />;
}
