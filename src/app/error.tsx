'use client';

import React from 'react';
import { ErrorBoundaryCard } from '@/components/shared/error-boundary-card';

export default function RootError({
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
      title="Application Error"
      subtitle="The system encountered a global exception. Use the recovery options below to reload the app state."
    />
  );
}
