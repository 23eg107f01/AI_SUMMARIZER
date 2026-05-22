export default function Skeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/60">
      <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  );
}