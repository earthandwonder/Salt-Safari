export default function SiteLoading() {
  return (
    <main className="min-h-screen">
      {/* Dark hero */}
      <div className="bg-deep pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-3 w-48 bg-white/10 rounded animate-pulse mb-4" />
          <div className="h-10 w-72 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-5 w-36 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      {/* Tab bar */}
      <div className="bg-white border-b border-slate-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-6 py-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
      {/* Content */}
      <div className="bg-sand px-6 py-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm">
              <div className="aspect-square bg-slate-100 animate-pulse" />
              <div className="p-3 space-y-1.5">
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
