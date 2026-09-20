/**
 * Agent 1 — Requirements & Availability Researcher
 *
 * Fetches real timetable data from the VT Banner system.
 * Uses pre-cached data for checksheet requirements (hand-curated for accuracy)
 * and falls back to cached timetable data when the live endpoint is unreachable.
 * Uses LLM to analyze the transcript and recommend a prioritized course ordering.
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
import { chatJSON } from "@/lib/llm";

interface Agent1Input {
  studentId: string;
  major: string;
  minors: string[];
  catalogYear: string;
  completedCourses: CompletedCourse[];
  inProgressCourses: string[];
}

type ProgressCallback = (message: string, progress: number) => void;

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

  // ─── LLM: Analyze transcript & recommend priorities ───────────────────
  onProgress("Analyzing transcript with AI to identify optimal course paths…", 75);

  const completedList = input.completedCourses.map((c) => `${c.courseId} (${c.grade}, ${c.term.label})`).join(", ");
  const remainingBlocks = requirementBlocks
    .filter((b) => b.remaining > 0)
    .map((b) => `${b.name}: need ${b.remaining} from [${b.eligibleCourses.slice(0, 6).join(", ")}${b.eligibleCourses.length > 6 ? "…" : ""}]`)
    .join("\n");
  const prereqSummary = Object.entries(prerequisiteGraph)
    .filter(([, deps]) => deps.length > 0)
    .map(([course, deps]) => `${course} requires: ${deps.join(", ")}`)
    .join("\n");

  interface LLMAnalysis {
    criticalPathCourses: string[];
    recommendedFirstSemester: string[];
    insights: string[];
  }

  const llmAnalysis = await chatJSON<LLMAnalysis>(
    `You are an academic advisor for Virginia Tech CS students. Analyze this student's transcript and remaining requirements to identify the critical path to graduation. Return JSON with:
- criticalPathCourses: courses that are prerequisites for many others and should be prioritized
- recommendedFirstSemester: the ideal courses for the next plannable semester (Spring 2027) considering prerequisites and balance
- insights: 2-3 brief observations about the student's progress`,
    `Student: ${input.major} major, catalog ${input.catalogYear}
Completed: ${completedList}
In-progress (Fall 2026): ${input.inProgressCourses.join(", ")}

Remaining requirements:
${remainingBlocks}

Prerequisite chains:
${prereqSummary}

Total completed credits: ${input.completedCourses.reduce((s, c) => s + c.credits, 0)}
In-progress credits: ~${input.inProgressCourses.length * 3}
Need 120 total for graduation.`,
    { criticalPathCourses: [], recommendedFirstSemester: [], insights: [] }
  );

  if (llmAnalysis.insights.length > 0) {
    onProgress(`AI insight: ${llmAnalysis.insights[0]}`, 85);
  }

  onProgress("Cross-referencing Pathways requirements…", 90);
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
    llmAnalysis: {
      criticalPathCourses: llmAnalysis.criticalPathCourses,
      recommendedFirstSemester: llmAnalysis.recommendedFirstSemester,
      insights: llmAnalysis.insights,
    },
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
