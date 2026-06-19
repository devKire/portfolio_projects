'use client';

import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { registerUser } from '@/app/actions/auth';

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    const result = await registerUser(new FormData(event.currentTarget));
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
        <div className="mb-7 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[#33333a] bg-[#202024]">
            <UserPlus className="h-6 w-6 text-[#9a8cff]" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold text-white">Criar conta</h1>
          <p className="mt-2 text-sm text-[#9b9ba3]">
            Seu dashboard e portfólio serão criados automaticamente.
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

            <AuthField
              id="name"
              name="name"
              label="Nome"
              autoComplete="name"
              placeholder="Seu nome"
              autoFocus
            />
            <AuthField
              id="username"
              name="username"
              label="Username"
              autoComplete="username"
              placeholder="seu_username"
              hint="3–32 caracteres: letras minúsculas, números, hífen ou underscore."
              pattern="[a-z0-9_-]{3,32}"
            />
            <AuthField
              id="email"
              name="email"
              type="email"
              label="Email"
              autoComplete="email"
              placeholder="voce@email.com"
            />

            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block text-sm font-medium text-[#dcddde]"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete="new-password"
                  className="min-h-11 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 pr-12 text-base text-white outline-none placeholder:text-[#777780] focus:border-[#9a8cff] focus:ring-2 focus:ring-[#9a8cff]/20"
                  placeholder="Mínimo 8 caracteres"
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
              <p className="mt-1 text-xs text-[#777780]">
                Use ao menos uma letra e um número.
              </p>
            </div>

            <AuthField
              id="passwordConfirmation"
              name="passwordConfirmation"
              type={showPassword ? 'text' : 'password'}
              label="Confirmar senha"
              autoComplete="new-password"
              placeholder="Repita sua senha"
              minLength={8}
              maxLength={72}
            />

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
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Criar conta
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-[#9b9ba3]">
            Já tem conta?{' '}
            <Link
              href="/login"
              className="font-medium text-[#c9b8ff] underline-offset-4 hover:underline"
            >
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function AuthField({
  id,
  label,
  hint,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-[#dcddde]"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required
        className="min-h-11 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 text-base text-white outline-none placeholder:text-[#777780] focus:border-[#9a8cff] focus:ring-2 focus:ring-[#9a8cff]/20"
        {...props}
      />
      {hint ? <p className="mt-1 text-xs text-[#777780]">{hint}</p> : null}
    </div>
  );
}
