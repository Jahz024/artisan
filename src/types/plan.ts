import type {
  ArtDirection,
  PlanGraph,
  PresentationSpec,
  UserPreferences,
} from "@/types/contracts";

export type PlanStatus = "draft" | "generating" | "ready" | "error";

export interface PlanSummary {
  id: string;
  name: string;
  major: string;
  status: PlanStatus;
  theme: ArtDirection | string;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDetail extends PlanSummary {
  minors: string[];
  catalogYear: string;
  preferences: UserPreferences & {
    completedCourses?: unknown[];
    inProgressCourses?: string[];
  };
  planGraph: PlanGraph | null;
  presentationSpec: PresentationSpec | null;
}
