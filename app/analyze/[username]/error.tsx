'use client';

import { ErrorDisplay } from '@/components/shared/error-display';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <ErrorDisplay
        title="Failed to load analysis"
        message={error.message || 'An unexpected error occurred while analyzing this user.'}
        onRetry={reset}
      />
    </div>
  );
}
