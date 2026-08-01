"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  BriefcaseIcon,
  BuildingIcon,
  CircleCheckIcon,
  MapPinIcon,
  WalletIcon,
} from "lucide-react";
import { useJob } from "@/hooks/use-jobs";
import { useApplyToJob } from "@/hooks/use-applications";
import { useAuthStore } from "@/store/auth.store";
import { formatSalary } from "@/components/jobs/job-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
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

function ApplyForm({
  jobId,
  onCancel,
  onApplied,
}: {
  jobId: string;
  onCancel: () => void;
  onApplied: () => void;
}): JSX.Element {
  const [coverLetter, setCoverLetter] = useState("");
  const apply = useApplyToJob();

  function submit(): void {
    apply.mutate(
      { jobId, coverLetter: coverLetter || undefined },
      {
        onSuccess: () => {
          toast.success("Application submitted");
          onApplied();
        },
        onError: (err) => {
          const detail = getApiError(err);
          const message =
            detail?.code === "DUPLICATE_APPLICATION"
              ? "You've already applied to this job."
              : detail?.code === "PROFILE_REQUIRED"
                ? "Complete your candidate profile before applying."
                : detail?.code === "JOB_INACTIVE"
                  ? "This job is no longer accepting applications."
                  : (detail?.message ?? "Failed to submit application");
          toast.error(message);
        },
      },
    );
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-2 sm:w-80">
      <textarea
        rows={4}
        value={coverLetter}
        onChange={(e) => setCoverLetter(e.target.value)}
        placeholder="Cover letter (optional)…"
        maxLength={2000}
        className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={apply.isPending}
          onClick={submit}
          className="flex-1"
        >
          {apply.isPending ? "Submitting…" : "Submit application"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={apply.isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ApplyCta({
  jobId,
  isActive,
}: {
  jobId: string;
  isActive: boolean;
}): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

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

  if (user.role !== "candidate") {
    return (
      <p className="text-sm text-muted-foreground">
        Sign in with a candidate account to apply.
      </p>
    );
  }

  if (applied) {
    return (
      <Badge variant="secondary">
        <CircleCheckIcon data-icon="inline-start" /> Applied
      </Badge>
    );
  }

  if (!isActive) {
    return (
      <Button variant="default" disabled>
        Job closed
      </Button>
    );
  }

  if (applying) {
    return (
      <ApplyForm
        jobId={jobId}
        onCancel={() => setApplying(false)}
        onApplied={() => setApplied(true)}
      />
    );
  }

  return (
    <Button variant="default" onClick={() => setApplying(true)}>
      Apply
    </Button>
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
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-4xl px-4 pt-10">
          <Link
            href="/jobs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to jobs
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent">
                <BriefcaseIcon className="size-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  {job.title}
                </h1>
                <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                  <BuildingIcon className="size-4" />
                  {job.company.name}
                </p>
              </div>
            </div>
            <ApplyCta jobId={job.id} isActive={job.isActive} />
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            <Badge variant="secondary">{JOB_TYPE_LABEL[job.jobType]}</Badge>
            <Badge variant="outline">
              {EXPERIENCE_LABEL[job.experienceLevel]}
            </Badge>
            {job.location ? (
              <Badge variant="outline">
                <MapPinIcon data-icon="inline-start" /> {job.location}
              </Badge>
            ) : null}
            {salary ? (
              <Badge variant="outline">
                <WalletIcon data-icon="inline-start" /> {salary}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 pb-16">
        <Separator className="my-6" />

        <Card>
          <CardContent className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {job.description}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
