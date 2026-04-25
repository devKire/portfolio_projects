// app/admin/_components/ContentLoader.tsx
export default function ContentLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-400">Carregando...</p>
      </div>
    </div>
  );
}
