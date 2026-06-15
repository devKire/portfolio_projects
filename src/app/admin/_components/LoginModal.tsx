'use client';

import { Eye, EyeOff, Loader2, Lock, LogIn } from 'lucide-react';
import { useState } from 'react';

import { loginAdmin } from '@/app/actions/auth';

interface LoginModalProps {
  onLoginSuccess: () => void;
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const result = await loginAdmin(formData);

      if (result.success) {
        onLoginSuccess();
      } else {
        setError(result.error || 'Credenciais inválidas');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161619] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-md border border-[#33333a] bg-[#202024]">
            <Lock className="h-6 w-6 text-[#9a8cff]" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-white">
            Admin Workspace
          </h1>
          <p className="text-sm text-[#9b9ba3]">
            Acesse o painel de administração
          </p>
        </div>

        <div className="rounded-lg border border-[#33333a] bg-[#1e1e22] p-5 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div>
              <label className="mb-2 block text-xs font-medium text-[#dcddde]">
                Usuário
              </label>
              <input
                type="text"
                name="username"
                defaultValue="admin"
                className="h-10 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 text-sm text-white outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
                placeholder="Digite seu usuário"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[#dcddde]">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  defaultValue="admin123"
                  className="h-10 w-full rounded-md border border-[#303036] bg-[#19191d] px-3 pr-10 text-sm text-white outline-none placeholder:text-[#777780] focus:border-[#6f55d9]"
                  placeholder="Digite sua senha"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-[#777780] hover:text-[#dcddde]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#6f55d9] px-4 text-sm font-medium text-white hover:bg-[#7c66df] focus:ring-2 focus:ring-[#9a8cff]/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
