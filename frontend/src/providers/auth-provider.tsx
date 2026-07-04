"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { refreshSession } from "@/lib/api";
import { onAuthLogout, onAuthLogin } from "@/lib/auth-broadcast";

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const queryClient = useQueryClient();

  useEffect(() => {
    // refreshSession is single-flight, so React StrictMode's double invoke
    // (and any concurrent 401 refresh) collapses to one request. Writing to
    // the global store after a possible unmount is harmless.
    refreshSession()
      .then((session) => setAuth(session.accessToken, session.user))
      .catch(() => clearAuth())
      .finally(() => setInitialized());
  }, [setAuth, clearAuth, setInitialized]);

  useEffect(() => {
    // Logout in another tab → clear this tab's session + cached data. Any
    // mounted AuthGuard then redirects protected pages to /login on its own.
    return onAuthLogout(() => {
      clearAuth();
      queryClient.clear();
    });
  }, [clearAuth, queryClient]);

  useEffect(() => {
    // Login in another tab → adopt its session directly (no refresh, so no
    // stampede). Sharing the in-memory token across same-origin tabs adds no
    // new exposure.
    return onAuthLogin((accessToken, user) => setAuth(accessToken, user));
  }, [setAuth]);

  return <>{children}</>;
}
