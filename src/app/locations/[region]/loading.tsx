export default function RegionLoading() {
  return (
    <main className="min-h-screen">
      {/* Dark hero */}
      <div className="bg-deep pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-4" />
          <div className="h-10 w-64 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-5 w-48 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      {/* Content */}
      <div className="bg-sand px-6 py-10">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white shadow-sm">
              <div className="h-48 bg-slate-100 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-5 w-40 bg-slate-100 rounded animate-pulse" />
                <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
