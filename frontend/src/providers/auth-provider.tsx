"use client";

import { useEffect, useRef } from "react";
import axios from "axios";
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
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    localStorage.removeItem("prohire-auth");

    const controller = new AbortController();

    refreshSession(controller.signal)
      .then((session) => {
        setAuth(session.accessToken, session.user);
        setInitialized();
      })
      .catch((err) => {
        if (!axios.isCancel(err)) {
          clearAuth();
          setInitialized();
        }
      });

    return () => {
      controller.abort();
      attempted.current = false;
    };
  }, [setAuth, clearAuth, setInitialized]);

  return <>{children}</>;
}
