"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiError } from "@/lib/api";
import { useCreateCompanyJob } from "@/hooks/use-company-jobs";
import { JobForm } from "@/components/company/job-form";
import { Card, CardContent } from "@/components/ui/card";

export default function NewJobPage(): JSX.Element {
  const router = useRouter();
  const create = useCreateCompanyJob();

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-2xl px-4 pt-10 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">Post a job</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the details below — you can edit or deactivate it later.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pb-8">
        <Card>
          <CardContent>
            <JobForm
              submitLabel="Post job"
              pendingLabel="Posting…"
              isPending={create.isPending}
              onSubmit={(input) => {
                create.mutate(input, {
                  onSuccess: (job) => {
                    toast.success("Job posted");
                    router.push(`/company/jobs/${job.id}/edit`);
                  },
                  onError: (err) => {
                    toast.error(
                      getApiError(err)?.message ?? "Failed to post job",
                    );
                  },
                });
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
