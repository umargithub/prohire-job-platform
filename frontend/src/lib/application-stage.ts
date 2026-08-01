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
