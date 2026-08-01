"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BriefcaseIcon, FileTextIcon } from "lucide-react";
import { useMyApplications } from "@/hooks/use-applications";
import { STAGE_BADGE_VARIANT, STAGE_LABEL } from "@/lib/application-stage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ApplicationsList(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const { data, isPending, isError } = useMyApplications(page);
  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-3xl px-4 pt-12 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">My Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPending
              ? "Loading…"
              : `${total} application${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8">
        {isError ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Something went wrong loading your applications. Please try again.
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : data.applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent">
              <FileTextIcon className="size-6 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t applied to any jobs yet.
            </p>
            <Button size="sm" variant="outline" render={<Link href="/jobs" />}>
              Browse jobs
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.applications.map((application) => (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                        <BriefcaseIcon className="size-4 text-accent-foreground" />
                      </div>
                      <div>
                        <CardTitle>
                          <Link
                            href={`/jobs/${application.job.id}`}
                            className="hover:underline"
                          >
                            {application.job.title}
                          </Link>
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {application.job.company.name}
                        </p>
                      </div>
                    </div>
                    <Badge variant={STAGE_BADGE_VARIANT[application.stage]}>
                      {STAGE_LABEL[application.stage]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDate(application.appliedAt)}
                  </p>
                  {application.coverLetter && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                      {application.coverLetter}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isPending && !isError && totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                router.push(`/candidate/applications?page=${page - 1}`)
              }
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                router.push(`/candidate/applications?page=${page + 1}`)
              }
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CandidateApplicationsPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8" />}>
      <ApplicationsList />
    </Suspense>
  );
}
