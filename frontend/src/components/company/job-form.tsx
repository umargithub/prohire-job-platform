"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UpsertCompanyJobInput } from "@/lib/api/company";
import type { JobResponse } from "@/types/api";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const jobFormSchema = z
  .object({
    title: z.string().min(1, "Title is required").max(200),
    description: z.string().min(1, "Description is required"),
    location: z.string().max(200).optional(),
    jobType: z.enum(["remote", "hybrid", "onsite"]),
    experienceLevel: z.enum(["junior", "mid", "senior"]),
    salaryMin: z.string().optional(),
    salaryMax: z.string().optional(),
  })
  .refine(
    (d) => {
      const min = d.salaryMin ? Number(d.salaryMin) : undefined;
      const max = d.salaryMax ? Number(d.salaryMax) : undefined;
      return min === undefined || max === undefined || max >= min;
    },
    {
      message: "Max salary must be greater than or equal to min salary",
      path: ["salaryMax"],
    },
  );

type JobFormValues = z.infer<typeof jobFormSchema>;

function toDefaultValues(job?: JobResponse): JobFormValues {
  return {
    title: job?.title ?? "",
    description: job?.description ?? "",
    location: job?.location ?? "",
    jobType: job?.jobType ?? "remote",
    experienceLevel: job?.experienceLevel ?? "mid",
    salaryMin: job?.salaryMin ? String(job.salaryMin) : "",
    salaryMax: job?.salaryMax ? String(job.salaryMax) : "",
  };
}

export function JobForm({
  job,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
}: {
  job?: JobResponse;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (input: UpsertCompanyJobInput) => void;
}): JSX.Element {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: toDefaultValues(job),
  });

  const submit = handleSubmit((values) => {
    onSubmit({
      title: values.title,
      description: values.description,
      location: values.location || undefined,
      jobType: values.jobType,
      experienceLevel: values.experienceLevel,
      salaryMin: values.salaryMin ? Number(values.salaryMin) : undefined,
      salaryMax: values.salaryMax ? Number(values.salaryMax) : undefined,
    });
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Job title</Label>
        <Input
          id="title"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-xs text-destructive">{errors.title.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          rows={8}
          aria-invalid={!!errors.description}
          className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
          placeholder="Responsibilities, requirements, benefits…"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          placeholder="e.g. San Francisco, CA"
          {...register("location")}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="jobType">Job type</Label>
          <select
            id="jobType"
            className={SELECT_CLASS}
            {...register("jobType")}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">On-site</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="experienceLevel">Experience level</Label>
          <select
            id="experienceLevel"
            className={SELECT_CLASS}
            {...register("experienceLevel")}
          >
            <option value="junior">Junior</option>
            <option value="mid">Mid</option>
            <option value="senior">Senior</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salaryMin">Min salary (optional)</Label>
          <Input
            id="salaryMin"
            type="number"
            min={0}
            aria-invalid={!!errors.salaryMin}
            {...register("salaryMin")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="salaryMax">Max salary (optional)</Label>
          <Input
            id="salaryMax"
            type="number"
            min={0}
            aria-invalid={!!errors.salaryMax}
            {...register("salaryMax")}
          />
          {errors.salaryMax && (
            <p className="text-xs text-destructive">
              {errors.salaryMax.message}
            </p>
          )}
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
