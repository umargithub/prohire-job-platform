"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { useJobs } from "@/hooks/use-jobs";
import { useDebounce } from "@/hooks/use-debounce";
import { JobCard } from "@/components/jobs/job-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import type { JobFilters } from "@/lib/api/jobs";
import type { ExperienceLevel, JobType } from "@/types/api";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const SALARY_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: "50000", label: "$50k+" },
  { value: "100000", label: "$100k+" },
  { value: "150000", label: "$150k+" },
  { value: "200000", label: "$200k+" },
];

function JobsBrowse(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const search = searchParams.get("search") ?? "";
  const location = searchParams.get("location") ?? "";
  const jobType = searchParams.get("job_type") ?? "";
  const experienceLevel = searchParams.get("experience_level") ?? "";
  const salaryMin = searchParams.get("salary_min") ?? "";

  const filters: JobFilters = {
    page,
    ...(search ? { search } : {}),
    ...(location ? { location } : {}),
    ...(jobType ? { jobType: jobType as JobType } : {}),
    ...(experienceLevel
      ? { experienceLevel: experienceLevel as ExperienceLevel }
      : {}),
    ...(salaryMin ? { salaryMin: Number(salaryMin) } : {}),
  };

  const { data, isPending, isError, isPlaceholderData } = useJobs(filters);

  const updateParams = useCallback(
    (updates: Record<string, string | null>): void => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, searchParams],
  );

  // Free-text boxes: local state debounced into the URL (resetting to page 1).
  const [searchInput, setSearchInput] = useState(search);
  const debouncedSearch = useDebounce(searchInput, 300);
  const [locationInput, setLocationInput] = useState(location);
  const debouncedLocation = useDebounce(locationInput, 300);

  useEffect(() => {
    if (debouncedSearch !== search) {
      updateParams({ search: debouncedSearch || null, page: null });
    }
    // Intentionally only react to the debounced value; `search` reflects the
    // URL and is the comparison baseline, not a trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useEffect(() => {
    if (debouncedLocation !== location) {
      updateParams({ location: debouncedLocation || null, page: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedLocation]);

  const total = data?.total ?? 0;
  const limit = data?.limit ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasFilters = Boolean(
    search || location || jobType || experienceLevel || salaryMin,
  );

  return (
    <div>
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,var(--accent),transparent)]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-5xl px-4 pt-12 pb-2">
          <h1 className="text-3xl font-bold tracking-tight">Browse Jobs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPending
              ? "Loading…"
              : `${total} open position${total === 1 ? "" : "s"}`}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-8">
        <Card className="mb-6 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              placeholder="Search titles, skills, keywords…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 max-w-xs"
            />
            <Input
              type="text"
              placeholder="Location"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              className="h-8 max-w-[10rem]"
              aria-label="Location"
            />
            <select
              className={SELECT_CLASS}
              value={jobType}
              onChange={(e) =>
                updateParams({ job_type: e.target.value || null, page: null })
              }
              aria-label="Job type"
            >
              <option value="">All types</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">On-site</option>
            </select>
            <select
              className={SELECT_CLASS}
              value={experienceLevel}
              onChange={(e) =>
                updateParams({
                  experience_level: e.target.value || null,
                  page: null,
                })
              }
              aria-label="Experience level"
            >
              <option value="">All levels</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
            </select>
            <select
              className={SELECT_CLASS}
              value={salaryMin}
              onChange={(e) =>
                updateParams({ salary_min: e.target.value || null, page: null })
              }
              aria-label="Minimum salary"
            >
              <option value="">Any salary</option>
              {SALARY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {hasFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchInput("");
                  setLocationInput("");
                  router.push(pathname);
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
        </Card>

        {isError ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-destructive/10 px-4 py-12 text-center">
            <TriangleAlertIcon className="size-6 text-destructive" />
            <p className="text-sm text-destructive">
              Something went wrong loading jobs. Please try again.
            </p>
          </div>
        ) : isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : data.jobs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-accent">
              <SearchXIcon className="size-6 text-accent-foreground" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              No jobs match your filters.
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-4 sm:grid-cols-2 ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
          >
            {data.jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}

        {!isPending && !isError && totalPages > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
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
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function JobsPage(): JSX.Element {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8" />}>
      <JobsBrowse />
    </Suspense>
  );
}
