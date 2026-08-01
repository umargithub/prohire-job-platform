"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { UsersIcon } from "lucide-react";
import { getApiError } from "@/lib/api";
import { NEXT_STAGES } from "@/lib/api/applications";
import {
  useJobApplications,
  useUpdateApplicationStage,
} from "@/hooks/use-company-applications";
import { useCompanyJob } from "@/hooks/use-company-jobs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ApplicationStage, CompanyApplicationResponse } from "@/types/api";

const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied: "Applied",
  reviewed: "Reviewed",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
};

const STAGE_BADGE_VARIANT: Record<
  ApplicationStage,
  "secondary" | "outline" | "default" | "destructive"
> = {
  applied: "secondary",
  reviewed: "outline",
  interview: "default",
  offered: "default",
  rejected: "destructive",
};

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function ApplicantRow({
  application,
  jobId,
  page,
}: {
  application: CompanyApplicationResponse;
  jobId: string;
  page: number;
}): JSX.Element {
  const [nextStage, setNextStage] = useState<ApplicationStage>(
    application.stage,
  );
  const updateStage = useUpdateApplicationStage(jobId, page);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={application.candidate.avatarUrl ?? undefined} />
            <AvatarFallback className="bg-accent text-accent-foreground">
              {application.candidate.name[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{application.candidate.name}</p>
            <p className="text-sm text-muted-foreground">
              {application.candidate.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={STAGE_BADGE_VARIANT[application.stage]}>
            {STAGE_LABEL[application.stage]}
          </Badge>
          <select
            className={SELECT_CLASS}
            value={nextStage}
            onChange={(e) => setNextStage(e.target.value as ApplicationStage)}
            aria-label="Move to stage"
          >
            {NEXT_STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABEL[stage]}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={updateStage.isPending || nextStage === application.stage}
            onClick={() => {
              updateStage.mutate(
                {
                  id: application.id,
                  input: { stage: nextStage, version: application.version },
                },
                {
                  onSuccess: () => toast.success("Stage updated"),
                  onError: (err) => {
                    const detail = getApiError(err);
                    toast.error(
                      detail?.code === "CONFLICT"
                        ? "This application changed since you loaded it — refresh and try again."
                        : (detail?.message ?? "Failed to update stage"),
                    );
                  },
                },
              );
            }}
          >
            {updateStage.isPending ? "Updating…" : "Update"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicantsList(): JSX.Element {
  const params = useParams<{ id: string }>();
  const jobId = params.id;
  const router = useRouter();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const { data: job } = useCompanyJob(jobId);
  const { data, isPending, isError } = useJobApplications(jobId, page);

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
        <div className="mx-auto max-w-3xl px-4 pt-10 pb-2">
          <Link
            href="/company/jobs"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to my jobs
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Applicants</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {job ? job.title : "Loading…"}
            {!isPending && ` · ${total} applicant${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8">
        {isError ? (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Something went wrong loading applicants. Please try again.
          </p>
        ) : isPending ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data.applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent">
              <UsersIcon className="size-6 text-accent-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No one has applied to this job yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {data.applications.map((application) => (
              <ApplicantRow
                key={application.id}
                application={application}
                jobId={jobId}
                page={page}
              />
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
                router.push(
                  `/company/jobs/${jobId}/applicants?page=${page - 1}`,
                )
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
                router.push(
                  `/company/jobs/${jobId}/applicants?page=${page + 1}`,
                )
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

export default function ApplicantsPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="mx-auto max-w-3xl px-4 py-8" />}>
      <ApplicantsList />
    </Suspense>
  );
}
