/**
 * Agent 2 — Professor & Course Experience Analyst
 *
 * Fetches real professor ratings from the RateMyProfessor GraphQL API.
 * Falls back to pre-cached data when the live API is unreachable.
 */

import type {
  RequirementsPackage,
  ExperiencePackage,
  InstructorRating,
  CourseRigorSummary,
} from "@/types/contracts";
import { fetchInstructorRating } from "@/lib/rmp-fetcher";
import { getRMPData } from "@/data/rmp-ratings";

type ProgressCallback = (message: string, progress: number) => void;

export async function runAgent2(
  reqPackage: RequirementsPackage,
  onProgress: ProgressCallback
): Promise<ExperiencePackage> {
  // Collect all unique instructors
  const instructors = new Set<string>();
  for (const section of reqPackage.currentTermSections) {
    if (section.instructor && section.instructor !== "Staff") {
      instructors.add(section.instructor);
    }
  }
  for (const offerings of Object.values(reqPackage.historicOfferings)) {
    for (const offering of offerings) {
      for (const hi of offering.historicInstructors) {
        if (hi.name !== "Staff") instructors.add(hi.name);
      }
    }
  }

  const total = instructors.size;
  let count = 0;
  let liveFetches = 0;
  let cacheFallbacks = 0;

  const cachedRMP = getRMPData();
  const instructorRatings: Record<string, InstructorRating> = {};

  onProgress(`Researching ${total} instructors on RateMyProfessors.com…`, 5);

  for (const name of instructors) {
    count++;
    const progress = Math.round((count / total) * 80) + 10;
    onProgress(`Querying RMP for ${name}… (${count}/${total})`, progress);

    // Try the live RMP GraphQL API first
    try {
      const liveRating = await fetchInstructorRating(name);
      if (liveRating && liveRating.numRatings > 0) {
        instructorRatings[name] = liveRating;
        liveFetches++;
        continue;
      }
    } catch (err) {
      // Live API failed — fall through to cache
      console.warn(`RMP live fetch failed for ${name}:`, err);
    }

    // Fallback to cached data
    if (cachedRMP[name]) {
      instructorRatings[name] = cachedRMP[name];
      cacheFallbacks++;
    } else {
      instructorRatings[name] = {
        name,
        overallRating: 0,
        difficulty: 0,
        wouldTakeAgain: 0,
        numRatings: 0,
        confidence: "low",
        paraphrasedFeedback: {
          rigor: "No RateMyProfessor profile found for this instructor.",
          workload: "No data available.",
          grading: "No data available.",
          expectations: "No data available.",
        },
        tags: [],
        source: {
          type: "rmp",
          label: `RateMyProfessors: ${name} (not found)`,
          accessedAt: new Date().toISOString(),
        },
      };
    }
  }

  onProgress(
    `Fetched ${liveFetches} live ratings, ${cacheFallbacks} from cache. Building rigor summaries…`,
    92
  );

  const courseRigorSummaries: Record<string, CourseRigorSummary> = {};
  for (const [courseId, courseInfo] of Object.entries(reqPackage.courseDetails)) {
    const relevantInstructors = reqPackage.currentTermSections
      .filter((s) => s.courseId === courseId && s.instructor !== "Staff")
      .map((s) => instructorRatings[s.instructor])
      .filter(Boolean);

    const avgDiff =
      relevantInstructors.length > 0
        ? relevantInstructors.reduce((sum, r) => sum + r.difficulty, 0) /
          relevantInstructors.length
        : 3.0;

    courseRigorSummaries[courseId] = {
      courseId,
      averageDifficulty: Math.round(avgDiff * 10) / 10,
      workloadDescription:
        avgDiff > 4 ? "Heavy" : avgDiff > 3 ? "Moderate" : "Manageable",
      gradingReputation:
        avgDiff > 4 ? "Tough grader" : avgDiff > 3 ? "Fair" : "Generous",
      summary: `${courseInfo.title}: Difficulty ${avgDiff.toFixed(1)}/5. ${
        avgDiff > 4
          ? "Students report significant workload."
          : avgDiff > 3
            ? "Workload is typical for the level."
            : "Generally considered approachable."
      }`,
    };
  }

  const sourceLabel =
    liveFetches > 0
      ? `Rate My Professors (${liveFetches} live, ${cacheFallbacks} cached)`
      : "Rate My Professors (cached — live API unavailable)";

  onProgress("Experience analysis complete.", 100);

  return {
    instructorRatings,
    courseRigorSummaries,
    sources: [
      {
        type: "rmp",
        label: sourceLabel,
        url: "https://www.ratemyprofessors.com/",
        accessedAt: new Date().toISOString(),
      },
    ],
  };
}
