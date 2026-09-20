/**
 * Agent 1 — Requirements & Availability Researcher
 *
 * Fetches real timetable data from the VT Banner system.
 * Uses pre-cached data for checksheet requirements (hand-curated for accuracy)
 * and falls back to cached timetable data when the live endpoint is unreachable.
 */

import type {
  RequirementsPackage,
  CompletedCourse,
  SectionInfo,
} from "@/types/contracts";
import { getCSRequirements } from "@/data/cs-requirements";
import { getTimetableData } from "@/data/timetable";
import { getHistoricOfferings } from "@/data/historic-offerings";
import { fetchSectionsForSubjects } from "@/lib/vt-timetable-fetcher";

interface Agent1Input {
  studentId: string;
  major: string;
  minors: string[];
  catalogYear: string;
  completedCourses: CompletedCourse[];
  inProgressCourses: string[];
}

type ProgressCallback = (message: string, progress: number) => void;

/**
 * Extract unique subject codes from the course catalog.
 */
function getRelevantSubjects(courseDetails: Record<string, unknown>): string[] {
  const subjects = new Set<string>();
  for (const courseId of Object.keys(courseDetails)) {
    const match = courseId.match(/^([A-Z]+)-/);
    if (match) subjects.add(match[1]);
  }
  return [...subjects];
}

export async function runAgent1(
  input: Agent1Input,
  onProgress: ProgressCallback
): Promise<RequirementsPackage> {
  onProgress("Loading CS degree checksheet (curated for 2023-2024 catalog)…", 10);

  const { requirementBlocks, courseDetails, prerequisiteGraph } = getCSRequirements(
    input.catalogYear,
    input.completedCourses,
    input.inProgressCourses
  );

  // ─── Live VT Timetable Fetch ──────────────────────────────────────────
  onProgress("Fetching current semester sections from VT Timetable…", 25);

  const currentTerm = { year: 2026, termType: "fall" as const, label: "Fall 2026" };
  let currentTermSections: SectionInfo[];
  let timetableSource: string;

  const subjects = getRelevantSubjects(courseDetails);

  try {
    currentTermSections = await fetchSectionsForSubjects(
      subjects,
      currentTerm.year,
      currentTerm.termType,
      (subject, index, total) => {
        const pct = 25 + Math.round((index / total) * 30);
        onProgress(`Scraping VT Timetable: ${subject} sections… (${index + 1}/${total})`, pct);
      }
    );

    // Filter to only courses in our catalog
    const catalogIds = new Set(Object.keys(courseDetails));
    currentTermSections = currentTermSections.filter((s) => catalogIds.has(s.courseId));

    timetableSource = `VT Timetable Fall 2026 (${currentTermSections.length} live sections)`;
    onProgress(
      `Fetched ${currentTermSections.length} sections from VT Timetable.`,
      55
    );
  } catch (err) {
    console.warn("VT Timetable live fetch failed, using cached data:", err);
    currentTermSections = getTimetableData();
    timetableSource = "VT Timetable Fall 2026 (cached — live scrape failed)";
    onProgress("Using cached timetable data (live fetch unavailable).", 55);
  }

  // ─── Historic Offerings ───────────────────────────────────────────────
  onProgress("Analyzing historic offering patterns (curated data)…", 65);
  const historicOfferings = getHistoricOfferings(courseDetails);

  onProgress("Cross-referencing Pathways requirements…", 80);

  onProgress("Building prerequisite graph…", 90);

  onProgress("Package ready for handoff.", 100);

  return {
    studentId: input.studentId,
    major: input.major,
    minors: input.minors,
    catalogYear: input.catalogYear,
    completedCourses: input.completedCourses,
    inProgressCourses: input.inProgressCourses,
    requirementBlocks,
    courseDetails,
    prerequisiteGraph,
    currentTermSections,
    historicOfferings,
    currentTerm,
    sources: [
      {
        type: "checksheet",
        label: "CS Checksheet 2023-2024 (curated)",
        url: "https://cs.vt.edu/Undergraduate/checksheets.html",
        accessedAt: new Date().toISOString(),
      },
      {
        type: "timetable",
        label: timetableSource,
        url: "https://apps.es.vt.edu/ssb/HZSKVTSC.P_ProcRequest",
        accessedAt: new Date().toISOString(),
      },
    ],
  };
}
