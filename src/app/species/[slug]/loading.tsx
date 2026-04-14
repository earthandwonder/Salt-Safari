export default function SpeciesLoading() {
  return (
    <main className="min-h-screen">
      {/* Dark hero */}
      <div className="bg-deep pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="h-9 w-56 bg-white/10 rounded animate-pulse mb-3" />
          <div className="h-5 w-40 bg-white/10 rounded animate-pulse italic" />
        </div>
      </div>
      {/* Content */}
      <div className="bg-sand px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-64 w-full bg-slate-100 rounded-2xl animate-pulse" />
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </main>
  );
}
