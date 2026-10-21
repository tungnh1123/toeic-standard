'use client';

import React, { useState, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export interface QueryProviderProps {
  children: ReactNode;
}

interface ApiErrorLike {
  statusCode?: number;
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false;
  }
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = (error as ApiErrorLike).statusCode;
    if (
      statusCode === 400 ||
      statusCode === 401 ||
      statusCode === 403 ||
      statusCode === 404
    ) {
      return false;
    }
  }
  return true;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({
  children,
}: QueryProviderProps): React.ReactElement => {
  const [queryClient] = useState<QueryClient>(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

