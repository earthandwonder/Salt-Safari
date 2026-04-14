export default function CreditsLoading() {
  return (
    <main className="min-h-screen">
      {/* Dark hero */}
      <div className="bg-deep pt-24 pb-10 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="h-9 w-48 bg-white/10 rounded animate-pulse" />
        </div>
      </div>
      {/* Content */}
      <div className="bg-sand px-6 py-10">
        <div className="max-w-3xl mx-auto space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-slate-100 rounded animate-pulse" style={{ width: `${85 - i * 8}%` }} />
          ))}
        </div>
      </div>
    </main>
  );
}
