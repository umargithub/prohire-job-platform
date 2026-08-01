import Link from "next/link";
import { BriefcaseIcon, MapPinIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ExperienceLevel, JobResponse, JobType } from "@/types/api";

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

export function formatSalary(
  min: number | null,
  max: number | null,
): string | null {
  const fmt = (n: number): string => `$${Math.round(n / 1000)}k`;
  if (min !== null && max !== null) return `${fmt(min)} – ${fmt(max)}`;
  if (min !== null) return `From ${fmt(min)}`;
  if (max !== null) return `Up to ${fmt(max)}`;
  return null;
}

export function JobCard({ job }: { job: JobResponse }): JSX.Element {
  const salary = formatSalary(job.salaryMin, job.salaryMax);

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <Card className="h-full ring-foreground/10 transition-shadow hover:shadow-md hover:ring-foreground/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent">
              <BriefcaseIcon className="size-4 text-accent-foreground" />
            </div>
            {salary ? (
              <span className="mt-1 text-sm font-semibold text-foreground">
                {salary}
              </span>
            ) : null}
          </div>
          <CardTitle className="mt-3 line-clamp-2 text-base">
            {job.title}
          </CardTitle>
          <CardDescription>{job.company.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {job.location ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPinIcon className="size-3.5 shrink-0" />
              {job.location}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{JOB_TYPE_LABEL[job.jobType]}</Badge>
            <Badge variant="outline">
              {EXPERIENCE_LABEL[job.experienceLevel]}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
