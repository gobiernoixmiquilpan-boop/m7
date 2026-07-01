export default function Loading() {
  return (
    <main className="min-h-screen flex flex-col" style={{ background: "linear-gradient(160deg,#fdf1f4 0%,#f8f4f8 50%,#f4f4ff 100%)" }}>
      <header className="rounded-b-[2rem] shadow-2xl" style={{ background: "linear-gradient(145deg,#2a0710 0%,#6e112c 50%,#9b1840 85%,#7a1535 100%)" }}>
        <div className="max-w-sm mx-auto px-5 pt-6 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-white/20 animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-40 bg-white/20 rounded-full animate-pulse" />
              <div className="h-2 w-32 bg-white/15 rounded-full animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-20 bg-white/15 rounded-full animate-pulse mb-1" />
          <div className="h-5 w-44 bg-white/25 rounded-full animate-pulse" />
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-4 pt-6 pb-10">
        <div className="w-full max-w-sm space-y-4">
          <div className="bg-white rounded-3xl border border-gray-100 h-52 animate-pulse shadow-sm" />
          <div className="bg-white rounded-2xl border border-gray-100 h-40 animate-pulse shadow-sm" />
          <div className="bg-white rounded-2xl border border-gray-100 h-32 animate-pulse shadow-sm" />
          <div className="bg-guinda-50 border border-guinda-100 rounded-2xl h-14 animate-pulse" />
          <div className="h-12 rounded-2xl animate-pulse" style={{ background: "linear-gradient(135deg,#8b143866 0%,#6e112c66 100%)" }} />
        </div>
      </div>
    </main>
  );
}
