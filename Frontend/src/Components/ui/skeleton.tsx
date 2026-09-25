import { cn } from "@/lib/utils"; 

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-gray-800/70 light:bg-gray-200/80",
        className
      )}
      {...props}
    />
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-800 light:border-gray-200 bg-gray-900/40 light:bg-white p-4 space-y-4">
      <Skeleton className="w-full h-48 rounded-xl" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-6 w-3/5 rounded-lg" />
        <Skeleton className="h-6 w-12 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-4/5 rounded-md" />
    </div>
  );
}



