export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-800/50 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-800/30 rounded-lg"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-9 w-64 bg-slate-800/30 rounded-lg"></div>
          <div className="h-9 w-32 bg-slate-800/50 rounded-lg"></div>
        </div>
      </div>

      {/* Metrics Row Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-slate-950 border border-white/5 p-6 rounded-xl h-[120px] flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <div className="h-4 w-8 bg-slate-800/50 rounded"></div>
              <div className="h-5 w-12 bg-slate-800/30 rounded-full"></div>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-800/30 rounded"></div>
              <div className="h-8 w-32 bg-slate-800/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Activity Log) - Spans 2 cols */}
        <div className="lg:col-span-2 bg-slate-950 border border-white/5 rounded-xl overflow-hidden h-[500px]">
          <div className="p-6 border-b border-white/5 flex justify-between">
            <div className="h-5 w-32 bg-slate-800/50 rounded"></div>
            <div className="h-4 w-16 bg-slate-800/30 rounded"></div>
          </div>
          <div className="p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 p-2">
                <div className="h-2 w-2 rounded-full bg-slate-800/50 mt-2"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 bg-slate-800/30 rounded"></div>
                  <div className="h-3 w-1/4 bg-slate-800/20 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column (Widgets) */}
        <div className="space-y-6">
          {/* Eligible Wallets Skeleton */}
          <div className="bg-slate-950 border border-white/5 rounded-xl p-6 h-[180px] flex flex-col justify-between">
            <div className="h-4 w-32 bg-slate-800/50 rounded"></div>
            <div className="flex justify-between items-center">
              <div className="h-10 w-24 bg-slate-800/50 rounded"></div>
              <div className="h-12 w-12 rounded-full bg-slate-800/30"></div>
            </div>
            <div className="h-px bg-white/5"></div>
            <div className="flex justify-between">
              <div className="h-3 w-24 bg-slate-800/30 rounded"></div>
              <div className="h-3 w-16 bg-slate-800/30 rounded"></div>
            </div>
          </div>

          {/* Recent Claims List Skeleton */}
          <div className="bg-slate-950 border border-white/5 rounded-xl overflow-hidden h-[300px]">
            <div className="p-4 border-b border-white/5">
              <div className="h-4 w-28 bg-slate-800/50 rounded"></div>
            </div>
            <div className="p-0">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="flex justify-between p-4 border-b border-white/5 last:border-0"
                >
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded bg-slate-800/30"></div>
                    <div className="space-y-1">
                      <div className="h-3 w-24 bg-slate-800/40 rounded"></div>
                      <div className="h-2 w-16 bg-slate-800/20 rounded"></div>
                    </div>
                  </div>
                  <div className="h-4 w-12 bg-slate-800/30 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
