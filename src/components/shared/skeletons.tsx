/**
 * Skeleton loader components for each major page.
 * Uses the `.skeleton` CSS class from globals.css (shimmer animation).
 */

// ── Primitive building blocks ──────────────────────────────────────────────

function Sk({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

function SkCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border/40 bg-card/60 p-5 ${className}`}>
      {children}
    </div>
  );
}

// ── Dashboard skeleton ─────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sk className="w-10 h-10 rounded-full" />
        <div className="space-y-2">
          <Sk className="h-5 w-40" />
          <Sk className="h-3 w-24" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkCard key={i}>
            <Sk className="h-3 w-20 mb-3" />
            <Sk className="h-8 w-16 mb-2" />
            <Sk className="h-3 w-24" />
          </SkCard>
        ))}
      </div>

      {/* Tech progress */}
      <SkCard>
        <Sk className="h-4 w-32 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Sk className="w-7 h-7 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="flex justify-between">
                  <Sk className="h-3 w-24" />
                  <Sk className="h-3 w-12" />
                </div>
                <Sk className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </SkCard>

      {/* Activity + heatmap side-by-side on wider screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkCard>
          <Sk className="h-4 w-28 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="w-2 h-2 rounded-full shrink-0" />
                <Sk className={`h-3 ${i % 2 === 0 ? "w-48" : "w-36"}`} />
              </div>
            ))}
          </div>
        </SkCard>
        <SkCard>
          <Sk className="h-4 w-28 mb-4" />
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: 52 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Sk key={j} className="w-3 h-3 rounded-sm" />
                ))}
              </div>
            ))}
          </div>
        </SkCard>
      </div>
    </div>
  );
}

// ── Saved Questions skeleton ───────────────────────────────────────────────
export function SavedSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-6 w-40" />
          <Sk className="h-3 w-28" />
        </div>
        <Sk className="h-8 w-20 rounded-xl" />
      </div>

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 5 }).map((_, i) => (
          <Sk key={i} className={`h-8 rounded-xl ${i === 0 ? "w-16" : "w-24"}`} />
        ))}
      </div>

      {/* Question cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkCard key={i} className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Sk className="h-5 w-5 rounded" />
                <Sk className="h-4 w-52" />
              </div>
              <div className="flex gap-2">
                <Sk className="h-5 w-16 rounded-full" />
                <Sk className="h-5 w-20 rounded-full" />
              </div>
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-4/5" />
            </div>
            <Sk className="w-8 h-8 rounded-lg shrink-0" />
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Notes skeleton ─────────────────────────────────────────────────────────
export function NotesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-6 w-24" />
          <Sk className="h-3 w-36" />
        </div>
        <Sk className="h-9 w-28 rounded-xl" />
      </div>

      {/* Search */}
      <Sk className="h-10 w-full rounded-xl" />

      {/* Notes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkCard key={i} className="space-y-3 min-h-[160px]">
            <div className="flex items-start justify-between">
              <Sk className="h-4 w-36" />
              <Sk className="w-6 h-6 rounded" />
            </div>
            <div className="space-y-1.5">
              <Sk className="h-3 w-full" />
              <Sk className="h-3 w-4/5" />
              <Sk className="h-3 w-3/5" />
            </div>
            <div className="flex gap-1.5 mt-auto pt-2">
              <Sk className="h-5 w-14 rounded-full" />
              <Sk className="h-5 w-14 rounded-full" />
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Analytics skeleton ─────────────────────────────────────────────────────
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Sk className="h-7 w-32" />
        <Sk className="h-3 w-56" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkCard key={i} className="text-center space-y-2">
            <Sk className="h-8 w-12 mx-auto" />
            <Sk className="h-3 w-20 mx-auto" />
          </SkCard>
        ))}
      </div>

      {/* Chart area */}
      <SkCard>
        <Sk className="h-4 w-36 mb-4" />
        <Sk className="h-48 w-full rounded-xl" />
      </SkCard>

      {/* Two smaller charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkCard>
          <Sk className="h-4 w-28 mb-4" />
          <Sk className="h-36 w-full rounded-xl" />
        </SkCard>
        <SkCard>
          <Sk className="h-4 w-28 mb-4" />
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Sk className="w-6 h-6 rounded" />
                <Sk className={`h-3 flex-1 max-w-[${60 + i * 8}%]`} />
                <Sk className="h-3 w-10 shrink-0" />
              </div>
            ))}
          </div>
        </SkCard>
      </div>
    </div>
  );
}

// ── Technologies skeleton ──────────────────────────────────────────────────
export function TechnologiesSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Sk className="h-7 w-40" />
          <Sk className="h-3 w-52" />
        </div>
        <Sk className="h-9 w-32 rounded-xl" />
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <Sk className="h-10 flex-1 rounded-xl" />
        <Sk className="h-10 w-24 rounded-xl" />
      </div>

      {/* Tech grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkCard key={i} className="flex items-center gap-4">
            <Sk className="w-12 h-12 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Sk className="h-4 w-28" />
              <Sk className="h-3 w-20" />
              <Sk className="h-2 w-full rounded-full" />
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Mock Interview skeleton ────────────────────────────────────────────────
export function MockInterviewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Sk className="h-7 w-44" />
        <Sk className="h-3 w-64" />
      </div>

      {/* Start card */}
      <SkCard className="space-y-4">
        <div className="flex items-center gap-4">
          <Sk className="w-14 h-14 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Sk className="h-5 w-48" />
            <Sk className="h-3 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Sk className="h-10 rounded-xl" />
          <Sk className="h-10 rounded-xl" />
        </div>
        <Sk className="h-12 w-full rounded-xl" />
      </SkCard>

      {/* Past interviews */}
      <div className="space-y-2">
        <Sk className="h-4 w-32 mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <SkCard key={i} className="flex items-center gap-4">
            <Sk className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Sk className="h-3 w-36" />
              <Sk className="h-3 w-24" />
            </div>
            <Sk className="h-7 w-16 rounded-xl" />
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Generic fallback skeleton ──────────────────────────────────────────────
export function GenericPageSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-2">
        <Sk className="h-7 w-48" />
        <Sk className="h-3 w-72" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Sk key={i} className={`h-4 ${i % 3 === 0 ? "w-full" : i % 3 === 1 ? "w-4/5" : "w-3/5"}`} />
        ))}
      </div>
      <SkCard>
        <Sk className="h-32 w-full rounded-xl" />
      </SkCard>
    </div>
  );
}
