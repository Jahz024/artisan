import type {
  ArtDirection,
  CompletedCourse,
  PlanGraph,
  PresentationSpec,
  UserPreferences,
} from "@/types/contracts";

export type PlanStatus = "draft" | "generating" | "ready" | "error";

export type StoredPlanPreferences = UserPreferences & {
  completedCourses?: CompletedCourse[];
  inProgressCourses?: string[];
};

const DEFAULT_PREFERENCES: UserPreferences = {
  targetGraduation: { year: 2027, termType: "fall", label: "Fall 2027" },
  creditLoadMin: 12,
  creditLoadMax: 19,
  allowSummer: false,
  timePreferences: {
    preferEvening: false,
    noFridayClasses: false,
  },
  electiveInterests: [],
  electiveTags: [],
  priorityWeights: {
    professorRating: 7,
    rigorPreference: 5,
    timePreferenceFit: 6,
    graduatingSooner: 8,
  },
};

export function parseJsonArray<T>(raw: string, fallback: T[]): T[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

export function parseStoredPreferences(raw: string): StoredPlanPreferences {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return { ...DEFAULT_PREFERENCES };
    }
    return {
      ...DEFAULT_PREFERENCES,
      ...(parsed as StoredPlanPreferences),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function parsePlanGraph(raw: string): PlanGraph | null {
  if (!raw || raw === "{}") return null;
  try {
    return JSON.parse(raw) as PlanGraph;
  } catch {
    return null;
  }
}

export function parsePresentationSpec(raw: string): PresentationSpec | null {
  if (!raw || raw === "{}") return null;
  try {
    return JSON.parse(raw) as PresentationSpec;
  } catch {
    return null;
  }
}

export function serializeJson(value: unknown): string {
  return JSON.stringify(value);
}

export function isArtDirection(value: string): value is ArtDirection {
  return [
    "constellation",
    "subway_map",
    "mountain_trail",
    "circuit_board",
    "watercolor_garden",
    "blueprint",
  ].includes(value);
}
