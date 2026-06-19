'use client';

import { Eye, EyeOff, Loader2, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { loginUser } from '@/app/actions/auth';

export default function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await loginUser(new FormData(event.currentTarget));
    if (result.success) {
      router.replace('/admin');
      router.refresh();
      return;
    }

    setError(result.error);
    setLoading(false);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#161619] p-4 text-[#dcddde]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[#33333a] bg-[#202024]">
            <Lock className="h-6 w-6 text-[#9a8cff]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-white">
            Portfolio Workspace
          </h1>
          <p className="mt-2 text-sm text-[#9b9ba3]">
            Entre para acessar seu painel.
          </p>
        </div>

        <div className="rounded-lg border border-[#33333a] bg-[#1e1e22] p-5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div aria-live="polite">
              {error ? (
                <div
                  role="alert"
                  className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                >
                  {error}
                </div>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-medium text-[#dcddde]"
              >
                Email ou nome de usuário
              </label>
              <input
                id="identifier"
                type="text"
                name="identifier"
                className="min-h-11 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 text-base text-white outline-none placeholder:text-[#777780] focus:border-[#9a8cff] focus:ring-2 focus:ring-[#9a8cff]/20"
                placeholder="voce@email.com ou username"
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-[#dcddde]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="min-h-11 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 pr-12 text-base text-white outline-none placeholder:text-[#777780] focus:border-[#9a8cff] focus:ring-2 focus:ring-[#9a8cff]/20"
                  placeholder="Sua senha"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center rounded-r-md text-[#9b9ba3] hover:text-white focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" aria-hidden="true" />
                  ) : (
                    <Eye className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm font-medium text-white transition-colors hover:bg-[#7c66df] focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    aria-hidden="true"
                  />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  Entrar
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#9b9ba3]">
            Ainda não tem conta?{' '}
            <Link
              href="/register"
              className="font-medium text-[#c9b8ff] underline-offset-4 hover:underline"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
