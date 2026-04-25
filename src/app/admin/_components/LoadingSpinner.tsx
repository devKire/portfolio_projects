// app/admin/_components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner principal */}
        <div className="relative">
          {/* Círculo externo */}
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-800 border-t-blue-500" />

          {/* Círculo interno (efeito duplo) */}
          <div
            className="absolute inset-1 h-10 w-10 animate-spin rounded-full border-4 border-gray-800 border-b-purple-500"
            style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
          />
        </div>

        {/* Texto opcional */}
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">Carregando</p>
          <p className="text-xs text-gray-500">Painel administrativo</p>
        </div>

        {/* Dots animados */}
        <div className="flex gap-1">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-blue-500"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-purple-500"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-pink-500"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
