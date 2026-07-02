import { Skeleton } from '@/components/ui/skeleton';

/** Shimmer placeholder for a short list of rows still loading (documents, snapshots, shares). */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-2.5 flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  );
}
