"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiError } from "@/lib/api";
import {
  useCompanyJob,
  useDeleteCompanyJob,
  useUpdateCompanyJob,
} from "@/hooks/use-company-jobs";
import { JobForm } from "@/components/company/job-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditJobPage(): JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();
  const { data: job, isPending, isError } = useCompanyJob(id);
  const update = useUpdateCompanyJob(id);
  const deleteJob = useDeleteCompanyJob();

  if (isPending) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Job not found</h1>
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          render={<Link href="/company/jobs" />}
        >
          Back to my jobs
        </Button>
      </div>
    );
  }

  function handleDelete(): void {
    if (!window.confirm("Delete this job posting? This cannot be undone.")) {
      return;
    }
    deleteJob.mutate(id, {
      onSuccess: () => {
        toast.success("Job deleted");
        router.push("/company/jobs");
      },
      onError: (err) => {
        toast.error(getApiError(err)?.message ?? "Failed to delete job");
      },
    });
  }

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Edit job</h1>
            <Badge variant={job.isActive ? "secondary" : "outline"}>
              {job.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{job.title}</p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-8">
        <Card>
          <CardContent>
            <JobForm
              job={job}
              submitLabel="Save changes"
              pendingLabel="Saving…"
              isPending={update.isPending}
              onSubmit={(input) => {
                update.mutate(input, {
                  onSuccess: () => toast.success("Job updated"),
                  onError: (err) => {
                    toast.error(
                      getApiError(err)?.message ?? "Failed to update job",
                    );
                  },
                });
              }}
            />
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">
                {job.isActive ? "Deactivate this job" : "Reactivate this job"}
              </p>
              <p className="text-sm text-muted-foreground">
                {job.isActive
                  ? "Inactive jobs are hidden from candidates but keep their applicants."
                  : "Reactivating makes this job visible to candidates again."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={update.isPending}
              onClick={() => {
                update.mutate(
                  { isActive: !job.isActive },
                  {
                    onSuccess: () =>
                      toast.success(
                        job.isActive ? "Job deactivated" : "Job reactivated",
                      ),
                    onError: (err) => {
                      toast.error(
                        getApiError(err)?.message ??
                          "Failed to update job status",
                      );
                    },
                  },
                );
              }}
            >
              {job.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 border-destructive/30">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete this job</p>
              <p className="text-sm text-muted-foreground">
                Permanently removes the listing. This cannot be undone.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteJob.isPending}
              onClick={handleDelete}
            >
              {deleteJob.isPending ? "Deleting…" : "Delete job"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
