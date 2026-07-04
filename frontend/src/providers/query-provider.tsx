"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { useState, type ReactNode } from "react";

interface QueryProviderProps {
  children: ReactNode;
}

// 4xx responses are deterministic — retrying can't change the outcome, and
// retrying a 401 (after the interceptor already tried and failed to refresh)
// just fires a second doomed /auth/refresh. Retry once for network/5xx only.
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status !== undefined && status >= 400 && status < 500) return false;
  return failureCount < 1;
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: shouldRetry,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
