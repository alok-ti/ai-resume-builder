'use client';

import React from 'react';
import { ErrorBoundaryCard } from '@/components/shared/error-boundary-card';

export default function BuilderError({
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
      title="Builder Canvas Crash"
      subtitle="The resume editor canvas hit a rendering mismatch or template compiling issue. You can safely try to reset the workspace state."
    />
  );
}
