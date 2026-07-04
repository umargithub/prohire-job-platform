"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import { refreshSession } from "@/lib/api";

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    // refreshSession is single-flight, so React StrictMode's double invoke
    // (and any concurrent 401 refresh) collapses to one request. Writing to
    // the global store after a possible unmount is harmless.
    refreshSession()
      .then((session) => setAuth(session.accessToken, session.user))
      .catch(() => clearAuth())
      .finally(() => setInitialized());
  }, [setAuth, clearAuth, setInitialized]);

  return <>{children}</>;
}
