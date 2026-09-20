/**
 * Real RateMyProfessor GraphQL API fetcher.
 *
 * Searches for a professor at Virginia Tech and returns their ratings,
 * difficulty, tags, and recent student comments.
 */

import type { InstructorRating, SourceReference } from "@/types/contracts";

const RMP_GRAPHQL = "https://www.ratemyprofessors.com/graphql";
const RMP_AUTH = "Basic dGVzdDp0ZXN0";

// Virginia Tech's base64-encoded school ID on RateMyProfessor
// Decoded: "School-1349"
const VT_SCHOOL_ID = "U2Nob29sLTEzNDk=";

// ─── GraphQL Queries ────────────────────────────────────────────────────────

const SEARCH_TEACHER_QUERY = `
query NewSearchTeachersQuery($query: TeacherSearchQuery!) {
  newSearch {
    teachers(query: $query) {
      edges {
        cursor
        node {
          id
          legacyId
          firstName
          lastName
          school { name id }
          department
          avgRating
          avgDifficulty
          numRatings
          wouldTakeAgainPercent
        }
      }
    }
  }
}
`;

const TEACHER_RATINGS_QUERY = `
query TeacherRatingsPageQuery($id: ID!) {
  node(id: $id) {
    __typename
    ... on Teacher {
      id
      legacyId
      firstName
      lastName
      department
      school { name id }
      avgRating
      avgDifficulty
      numRatings
      wouldTakeAgainPercent
      teacherRatingTags {
        tagName
        tagCount
      }
      ratings(first: 10) {
        edges {
          node {
            comment
            clarityRating
            helpfulRating
            difficultyRating
            wouldTakeAgain
            ratingTags
            class
            date
            grade
          }
        }
      }
    }
  }
}
`;

// ─── Types ──────────────────────────────────────────────────────────────────

interface RMPSearchResult {
  id: string;
  legacyId: number;
  firstName: string;
  lastName: string;
  department: string;
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number;
}

interface RMPRating {
  comment: string;
  clarityRating: number;
  helpfulRating: number;
  difficultyRating: number;
  wouldTakeAgain: number;
  ratingTags: string;
  class: string;
  date: string;
  grade: string;
}

interface RMPTeacherDetail {
  id: string;
  legacyId: number;
  firstName: string;
  lastName: string;
  department: string;
  avgRating: number;
  avgDifficulty: number;
  numRatings: number;
  wouldTakeAgainPercent: number;
  teacherRatingTags: { tagName: string; tagCount: number }[];
  ratings: { edges: { node: RMPRating }[] };
}

// ─── API Helpers ────────────────────────────────────────────────────────────

async function rmpFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(RMP_GRAPHQL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: RMP_AUTH,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`RMP API returned ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`RMP GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}

// ─── Public Functions ───────────────────────────────────────────────────────

/**
 * Search for a professor at Virginia Tech by name.
 * Handles formats like "McQuain W" (LastName FirstInitial) and "William McQuain".
 * Returns the best matching result, or null if not found.
 */
export async function searchProfessor(name: string): Promise<RMPSearchResult | null> {
  const normalizedName = name.normalize("NFKD").trim();

  // Handle "LastName FirstInitial" format (e.g., "McQuain W")
  const lastFirstMatch = normalizedName.match(/^(\w+)\s+([A-Z])$/);
  const searchText = lastFirstMatch ? lastFirstMatch[1] : normalizedName;

  const data = await rmpFetch<{
    newSearch: { teachers: { edges: { node: RMPSearchResult }[] } };
  }>(SEARCH_TEACHER_QUERY, {
    query: { text: searchText, schoolID: VT_SCHOOL_ID },
  });

  const edges = data.newSearch.teachers.edges;
  if (!edges || edges.length === 0) return null;

  // Try to find exact last name match
  const targetLastName = lastFirstMatch
    ? lastFirstMatch[1].toLowerCase()
    : normalizedName.split(/\s+/).pop()?.replace(/[^a-zA-Z]/g, "").toLowerCase();

  const exactMatch = edges.find(
    (e) => e.node.lastName.toLowerCase() === targetLastName
  );

  // If we have first initial, match that too
  if (exactMatch && lastFirstMatch) {
    const initial = lastFirstMatch[2].toLowerCase();
    if (exactMatch.node.firstName.toLowerCase().startsWith(initial)) {
      return exactMatch.node;
    }
    // Wrong initial — still the best match by last name
  }

  return exactMatch?.node ?? edges[0].node;
}

/**
 * Get detailed ratings for a professor by their RMP GraphQL ID.
 */
export async function getProfessorDetail(rmpId: string): Promise<RMPTeacherDetail | null> {
  const data = await rmpFetch<{ node: RMPTeacherDetail | null }>(TEACHER_RATINGS_QUERY, {
    id: rmpId,
  });
  return data.node;
}

/**
 * Synthesize paraphrased feedback from actual student comments.
 */
function synthesizeFeedback(ratings: RMPRating[]): InstructorRating["paraphrasedFeedback"] {
  const comments = ratings
    .map((r) => r.comment)
    .filter((c) => c && c.length > 10);

  if (comments.length === 0) {
    return {
      rigor: "No detailed student comments available.",
      workload: "No detailed student comments available.",
      grading: "No detailed student comments available.",
      expectations: "No detailed student comments available.",
    };
  }

  // Extract keyword-based summaries from real comments
  const rigorKeywords = ["hard", "difficult", "challenging", "tough", "easy", "straightforward", "intense", "rigorous"];
  const workloadKeywords = ["homework", "assignment", "project", "workload", "reading", "lab", "exam", "test", "quiz"];
  const gradingKeywords = ["grade", "grading", "rubric", "curve", "partial credit", "fair", "strict", "lenient"];
  const expectKeywords = ["office hours", "attend", "lecture", "prepare", "study", "expect", "helpful", "approachable"];

  function findRelevantComment(keywords: string[]): string {
    for (const comment of comments) {
      const lower = comment.toLowerCase();
      if (keywords.some((kw) => lower.includes(kw))) {
        return comment.length > 200 ? comment.slice(0, 197) + "…" : comment;
      }
    }
    return comments[0].length > 200 ? comments[0].slice(0, 197) + "…" : comments[0];
  }

  return {
    rigor: findRelevantComment(rigorKeywords),
    workload: findRelevantComment(workloadKeywords),
    grading: findRelevantComment(gradingKeywords),
    expectations: findRelevantComment(expectKeywords),
  };
}

/**
 * Fetch a full InstructorRating for a professor name at VT.
 * Returns null if the professor can't be found on RMP.
 */
export async function fetchInstructorRating(name: string): Promise<InstructorRating | null> {
  const searchResult = await searchProfessor(name);
  if (!searchResult || searchResult.numRatings === 0) return null;

  const detail = await getProfessorDetail(searchResult.id);
  if (!detail) return null;

  const ratings = detail.ratings?.edges?.map((e) => e.node) ?? [];
  const tags = (detail.teacherRatingTags ?? [])
    .sort((a, b) => b.tagCount - a.tagCount)
    .slice(0, 5)
    .map((t) => t.tagName.toLowerCase());

  const confidence =
    detail.numRatings >= 15 ? "high" : detail.numRatings >= 5 ? "medium" : ("low" as const);

  const source: SourceReference = {
    type: "rmp",
    label: `RateMyProfessors: ${detail.firstName} ${detail.lastName}`,
    url: `https://www.ratemyprofessors.com/professor/${detail.legacyId}`,
    accessedAt: new Date().toISOString(),
  };

  return {
    name,
    overallRating: detail.avgRating,
    difficulty: detail.avgDifficulty,
    wouldTakeAgain: detail.wouldTakeAgainPercent >= 0 ? detail.wouldTakeAgainPercent : 0,
    numRatings: detail.numRatings,
    confidence,
    paraphrasedFeedback: synthesizeFeedback(ratings),
    tags,
    source,
  };
}
