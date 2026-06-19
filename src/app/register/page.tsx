import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth/session';

import RegisterForm from './RegisterForm';

export const metadata: Metadata = {
  title: 'Criar conta | Portfolio Workspace',
  description: 'Crie seu dashboard e portfólio.',
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/admin');
  return <RegisterForm />;
}
