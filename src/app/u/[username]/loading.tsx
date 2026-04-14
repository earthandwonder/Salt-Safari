export default function ProfileLoading() {
  return (
    <main className="min-h-screen">
      {/* Dark hero */}
      <div className="bg-deep pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/10 animate-pulse mb-4" />
          <div className="h-7 w-40 bg-white/10 rounded animate-pulse mb-2" />
          <div className="h-4 w-28 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      {/* Stats row */}
      <div className="bg-sand px-6 py-6">
        <div className="max-w-5xl mx-auto flex justify-center gap-10">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className="h-6 w-10 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 w-14 bg-slate-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
      {/* Card grid */}
      <div className="bg-sand px-6 pb-10">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-3">
                <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
