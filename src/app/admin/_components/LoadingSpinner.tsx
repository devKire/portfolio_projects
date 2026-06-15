// app/admin/_components/LoadingSpinner.tsx
export default function LoadingSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#161619]">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner principal */}
        <div className="relative">
          {/* Círculo externo */}
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#303036] border-t-[#9a8cff]" />

          {/* Círculo interno (efeito duplo) */}
          <div
            className="absolute inset-1 h-8 w-8 animate-spin rounded-full border-4 border-[#303036] border-b-[#6f55d9]"
            style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
          />
        </div>

        {/* Texto opcional */}
        <div className="text-center">
          <p className="text-sm font-medium text-[#dcddde]">Carregando</p>
          <p className="text-xs text-[#777780]">Painel administrativo</p>
        </div>

        {/* Dots animados */}
        <div className="flex gap-1">
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#6f55d9]"
            style={{ animationDelay: '0s' }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#9a8cff]"
            style={{ animationDelay: '0.2s' }}
          />
          <div
            className="h-2 w-2 animate-bounce rounded-full bg-[#c9b8ff]"
            style={{ animationDelay: '0.4s' }}
          />
        </div>
      </div>
    </div>
  );
}
