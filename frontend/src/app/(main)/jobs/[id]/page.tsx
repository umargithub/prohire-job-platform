"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useJob } from "@/hooks/use-jobs";
import { useAuthStore } from "@/store/auth.store";
import { formatSalary } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { getApiError } from "@/lib/api";
import type { ExperienceLevel, JobType } from "@/types/api";

const JOB_TYPE_LABEL: Record<JobType, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
};

/**
 * The apply mutation itself belongs to the candidate vertical (needs a profile
 * check + POST /applications). Here we only render the correct CTA per auth
 * state; wiring the actual submission is the seam picked up next.
 */
function ApplyCta({ jobId }: { jobId: string }): JSX.Element {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <Button
        variant="default"
        render={<Link href={`/login?next=/jobs/${jobId}`} />}
      >
        Sign in to apply
      </Button>
    );
  }

  if (user.role === "candidate") {
    // TODO(candidate-vertical): wire to useApplyToJob mutation.
    return (
      <Button variant="default" disabled>
        Apply
      </Button>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Sign in with a candidate account to apply.
    </p>
  );
}

export default function JobDetailPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: job, isPending, isError, error } = useJob(id);

  if (isPending) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-5 w-40" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = getApiError(error)?.statusCode === 404;
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">
          {notFound ? "Job not found" : "Something went wrong"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {notFound
            ? "This position may have been closed or removed."
            : "Please try again in a moment."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          render={<Link href="/jobs" />}
        >
          Back to jobs
        </Button>
      </div>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/jobs"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to jobs
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{job.title}</h1>
          <p className="mt-1 text-muted-foreground">{job.company.name}</p>
        </div>
        <ApplyCta jobId={job.id} />
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        <Badge variant="secondary">{JOB_TYPE_LABEL[job.jobType]}</Badge>
        <Badge variant="outline">{EXPERIENCE_LABEL[job.experienceLevel]}</Badge>
        {job.location ? <Badge variant="outline">{job.location}</Badge> : null}
        {salary ? <Badge variant="outline">{salary}</Badge> : null}
      </div>

      <Separator className="my-6" />

      <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {job.description}
      </div>
    </div>
  );
}
