import type { ApplicationStage } from "@/types/api";

export const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied: "Applied",
  reviewed: "Reviewed",
  interview: "Interview",
  offered: "Offered",
  rejected: "Rejected",
};

export const STAGE_BADGE_VARIANT: Record<
  ApplicationStage,
  "secondary" | "outline" | "default" | "destructive"
> = {
  applied: "secondary",
  reviewed: "outline",
  interview: "default",
  offered: "default",
  rejected: "destructive",
};

/**
 * "rejected" is a terminal outcome reachable from any active stage, not a
 * pipeline step — only reviewed → interview → offered has an actual order.
 * Mirrors the backend's guard in application.service.ts; the server is the
 * real enforcement, this just keeps the UI from offering a move it'll reject.
 */
const PIPELINE_ORDER: Record<Exclude<ApplicationStage, "rejected">, number> = {
  applied: 0,
  reviewed: 1,
  interview: 2,
  offered: 3,
};

/** Stages a company can move an application to from its current stage. */
export function selectableStages(
  current: ApplicationStage,
): ReadonlyArray<ApplicationStage> {
  if (current === "rejected") return [];
  const currentOrder = PIPELINE_ORDER[current];
  return (["reviewed", "interview", "offered", "rejected"] as const).filter(
    (stage) => stage === "rejected" || PIPELINE_ORDER[stage] > currentOrder,
  );
}
