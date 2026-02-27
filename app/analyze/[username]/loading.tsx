import { DashboardSkeleton } from '@/components/shared/loading-skeleton';

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <DashboardSkeleton />
    </div>
  );
}
