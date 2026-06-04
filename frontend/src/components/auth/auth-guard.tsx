"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { isAdminRole } from "@/lib/permissions";
import type { UserRole } from "@/types/api";

interface AuthGuardProps {
  children: React.ReactNode;
  role?: UserRole | UserRole[];
}

export function AuthGuard({
  children,
  role,
}: AuthGuardProps): JSX.Element | null {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }

    if (role) {
      const allowed = Array.isArray(role) ? role : [role];
      if (!allowed.includes(user.role as UserRole)) {
        router.replace("/");
      }
    }
  }, [mounted, accessToken, user, role, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!accessToken || !user) return null;

  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(user.role as UserRole)) return null;
  }

  return <>{children}</>;
}

export function AdminGuard({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element | null {
  const router = useRouter();
  const { accessToken, user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!accessToken || !user) {
      router.replace("/login");
      return;
    }
    if (!isAdminRole(user.role as UserRole)) {
      router.replace("/");
    }
  }, [mounted, accessToken, user, router]);

  if (!mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!accessToken || !user || !isAdminRole(user.role as UserRole)) return null;

  return <>{children}</>;
}
