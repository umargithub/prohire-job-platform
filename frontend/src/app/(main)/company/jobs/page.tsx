"use client";

import Link from "next/link";
import { BriefcaseIcon, PlusIcon, UsersIcon } from "lucide-react";
import { useCompanyJobs } from "@/hooks/use-company-jobs";
import { formatSalary } from "@/components/jobs/job-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function CompanyJobsPage(): JSX.Element {
  const { data, isPending, isError } = useCompanyJobs();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">My Jobs</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {isPending
                  ? "Loading…"
                  : `${data?.total ?? 0} job posting${data?.total === 1 ? "" : "s"}`}
              </p>
            </div>
            <Button render={<Link href="/company/jobs/new" />}>
              <PlusIcon /> Post a job
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-8">
        {isError ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Something went wrong loading your jobs. Please try again.
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : data.data.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent">
              <BriefcaseIcon className="size-6 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              You haven&apos;t posted any jobs yet.
            </p>
            <Button
              size="sm"
              variant="outline"
              render={<Link href="/company/jobs/new" />}
            >
              Post your first job
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.data.map((job) => {
              const salary = formatSalary(job.salaryMin, job.salaryMax);
              return (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
                          <BriefcaseIcon className="size-4 text-accent-foreground" />
                        </div>
                        <div>
                          <CardTitle>{job.title}</CardTitle>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <Badge
                              variant={job.isActive ? "secondary" : "outline"}
                            >
                              {job.isActive ? "Active" : "Inactive"}
                            </Badge>
                            {job.location ? (
                              <Badge variant="outline">{job.location}</Badge>
                            ) : null}
                            {salary ? (
                              <Badge variant="outline">{salary}</Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Link
                      href={`/company/jobs/${job.id}/applicants`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                    >
                      <UsersIcon /> Applicants
                    </Link>
                    <Link
                      href={`/company/jobs/${job.id}/edit`}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                      )}
                    >
                      Edit
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
