export default function Loading() {
  return (
    <main className="min-h-screen bg-guinda-50 flex flex-col">
      <header className="bg-guinda-800 rounded-b-[2rem] shadow-lg">
        <div className="max-w-sm mx-auto px-5 pt-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/15 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-40 bg-white/20 rounded animate-pulse" />
              <div className="h-2 w-32 bg-white/15 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-28 bg-white/20 rounded animate-pulse" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-10">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 h-48 animate-pulse" />
          <div className="bg-white rounded-2xl border border-gray-100 h-40 animate-pulse" />
          <div className="bg-guinda-50 border border-guinda-100 rounded-2xl h-14 animate-pulse" />
          <div className="h-12 bg-guinda-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    </main>
  );
}
