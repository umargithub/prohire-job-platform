import Link from "next/link";
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
      <Card className="h-full ring-foreground/10 hover:ring-foreground/20">
        <CardHeader>
          <CardTitle className="line-clamp-2 text-base">{job.title}</CardTitle>
          <CardDescription>{job.company.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{JOB_TYPE_LABEL[job.jobType]}</Badge>
            <Badge variant="outline">
              {EXPERIENCE_LABEL[job.experienceLevel]}
            </Badge>
            {job.location ? (
              <Badge variant="outline">{job.location}</Badge>
            ) : null}
          </div>
          {salary ? (
            <p className="text-sm font-medium text-foreground">{salary}</p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
