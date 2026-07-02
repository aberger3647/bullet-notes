import { Skeleton } from '@/components/ui/skeleton';

/** Full-page shimmer shown while a document is being fetched, shaped like the outline it will become. */
export function OutlineLoadingSkeleton() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 pt-6">
      <Skeleton className="h-5 w-5 rounded-full" />
      <Skeleton className="h-7 w-48" />
      <div className="flex flex-col gap-2.5 pt-2">
        <Skeleton className="h-5 w-11/12" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="ml-6 h-5 w-3/5" />
        <Skeleton className="ml-6 h-5 w-2/3" />
        <Skeleton className="h-5 w-5/6" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </div>
  );
}
