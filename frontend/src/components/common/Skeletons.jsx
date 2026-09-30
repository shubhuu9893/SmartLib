export function SkeletonBookCard() {
  return (
    <div className="w-full" aria-hidden="true">
      <div className="skeleton aspect-[2/3] w-full rounded-xl" />
      <div className="skeleton mt-3 h-4 w-4/5" />
      <div className="skeleton mt-2 h-3 w-3/5" />
    </div>
  );
}

export function SkeletonBookRow({ count = 7, withTitle = true }) {
  return (
    <div aria-hidden="true">
      {withTitle && <div className="skeleton mb-4 h-6 w-48" />}
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="w-36 shrink-0 sm:w-40 lg:w-44">
            <SkeletonBookCard />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 12 }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-7" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBookCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card flex gap-4 p-3">
          <div className="skeleton h-24 w-16 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton h-4 w-1/2" />
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading page">
      <div className="space-y-3">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      <SkeletonBookRow />
      <SkeletonBookRow />
    </div>
  );
}
