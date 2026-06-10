export default function SkeletonLoader({ count = 5 }: { count?: number }) {
  return (
    <div className="px-4 space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="w-14 h-14 rounded-lg shimmer flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 rounded shimmer w-3/4" />
            <div className="h-3 rounded shimmer w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
