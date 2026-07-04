"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseIcon,
  ChevronDownIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  UsersIcon,
  BuildingIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/auth.store";
import { logout } from "@/lib/api/auth";
import { broadcastLogout } from "@/lib/auth-broadcast";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { isAdminRole } from "@/lib/permissions";
import type { UserRole } from "@/types/api";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
    >
      {children}
    </Link>
  );
}

function GuestNav() {
  return (
    <>
      <NavLink href="/jobs">Jobs</NavLink>
      <NavLink href="/login">Login</NavLink>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "flex items-center gap-1",
          )}
        >
          Register <ChevronDownIcon className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Link
              href="/register/candidate"
              className="flex w-full items-center gap-2"
            >
              <UsersIcon className="size-4" /> Candidate
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link
              href="/register/company"
              className="flex w-full items-center gap-2"
            >
              <BuildingIcon className="size-4" /> Company
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function CandidateNav() {
  return (
    <>
      <NavLink href="/jobs">Jobs</NavLink>
      <NavLink href="/candidate/applications">My Applications</NavLink>
      <NavLink href="/candidate/profile">Profile</NavLink>
    </>
  );
}

function CompanyNav() {
  return (
    <>
      <NavLink href="/company/jobs">My Jobs</NavLink>
      <NavLink href="/company/members">Team</NavLink>
      <NavLink href="/company/profile">Profile</NavLink>
    </>
  );
}

function AdminNav() {
  return (
    <>
      <NavLink href="/admin">
        <LayoutDashboardIcon className="size-4" /> Dashboard
      </NavLink>
      <NavLink href="/admin/users">Users</NavLink>
      <NavLink href="/admin/companies">Companies</NavLink>
      <NavLink href="/admin/jobs">
        <BriefcaseIcon className="size-4" /> Jobs
      </NavLink>
    </>
  );
}

function UserMenu({
  email,
  onLogout,
}: {
  email: string;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "flex max-w-[180px] items-center gap-1",
        )}
      >
        <span className="truncate">{email}</span>
        <ChevronDownIcon className="size-3.5 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOutIcon className="size-4" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const [mounted, setMounted] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore — still clear local state
    }
    clearAuth();
    queryClient.clear();
    broadcastLogout();
    router.push("/login");
  };

  const role = user?.role as UserRole | undefined;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg tracking-tight">
          ProHire
        </Link>

        <nav className="flex items-center gap-1">
          {mounted && (
            <>
              {!user && <GuestNav />}
              {role === "candidate" && <CandidateNav />}
              {role === "company" && <CompanyNav />}
              {role && isAdminRole(role) && <AdminNav />}
              {user && <UserMenu email={user.email} onLogout={handleLogout} />}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
