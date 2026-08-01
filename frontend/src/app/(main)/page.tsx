"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BriefcaseIcon, BuildingIcon, UsersIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { isAdminRole } from "@/lib/permissions";

interface HeroCta {
  href: string;
  label: string;
}

function useHeroCtas(): { primary: HeroCta; secondary: HeroCta } {
  const { user } = useAuthStore();

  if (!user) {
    return {
      primary: { href: "/jobs", label: "Browse jobs" },
      secondary: { href: "/register/company", label: "Post a job" },
    };
  }
  if (user.role === "candidate") {
    return {
      primary: { href: "/jobs", label: "Browse jobs" },
      secondary: { href: "/candidate/applications", label: "My applications" },
    };
  }
  if (user.role === "company") {
    return {
      primary: { href: "/company/jobs/new", label: "Post a job" },
      secondary: { href: "/company/jobs", label: "My jobs" },
    };
  }
  if (isAdminRole(user.role)) {
    return {
      primary: { href: "/admin", label: "Go to dashboard" },
      secondary: { href: "/jobs", label: "Browse jobs" },
    };
  }
  return {
    primary: { href: "/jobs", label: "Browse jobs" },
    secondary: { href: "/register/company", label: "Post a job" },
  };
}

export default function HomePage(): JSX.Element {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { primary, secondary } = useHeroCtas();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Find your next opportunity on{" "}
            <span className="text-primary">ProHire</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            A job board connecting candidates with companies hiring right now.
            Browse open roles or post a job in minutes.
          </p>
          {mounted && (
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={primary.href}
                className={cn(buttonVariants({ size: "lg" }))}
              >
                {primary.label}
              </Link>
              <Link
                href={secondary.href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                )}
              >
                {secondary.label}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <BriefcaseIcon className="size-5 text-accent-foreground" />
              </div>
              <CardTitle className="mt-3">Browse openings</CardTitle>
              <CardDescription>
                Filter by location, job type, experience level, and salary to
                find roles that fit.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <UsersIcon className="size-5 text-accent-foreground" />
              </div>
              <CardTitle className="mt-3">Apply as a candidate</CardTitle>
              <CardDescription>
                Build your profile once, then apply to jobs and track every
                application in one place.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
                <BuildingIcon className="size-5 text-accent-foreground" />
              </div>
              <CardTitle className="mt-3">Hire as a company</CardTitle>
              <CardDescription>
                Post jobs, review applicants, and manage your hiring team from a
                single dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>
    </div>
  );
}
