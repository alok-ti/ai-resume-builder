'use client';

import React from 'react';
import { ErrorBoundaryCard } from '@/components/shared/error-boundary-card';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundaryCard
      error={error}
      reset={reset}
      title="Dashboard Loading Error"
      subtitle="Failed to compile your dashboard. We could not fetch resumes, cover letters, or job application stats."
    />
  );
}
