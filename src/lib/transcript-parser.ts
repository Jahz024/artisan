import type { CompletedCourse, TermType } from "@/types/contracts";

export interface TranscriptParseResult {
  completedCourses: CompletedCourse[];
  inProgressCourses: string[];
  major?: string;
  minors?: string[];
  catalogYear?: string;
  usedDemoFallback?: boolean;
}

function termFromLabel(label: string): { year: number; termType: TermType; label: string } | null {
  const match = label.match(/^(Fall|Spring|Summer)\s+(\d{4})$/i);
  if (!match) return null;
  const termType = match[1].toLowerCase() as TermType;
  const year = Number.parseInt(match[2], 10);
  return { year, termType, label: `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${year}` };
}

function normalizeCourseId(subject: string, number: string): string {
  return `${subject.toUpperCase()}-${number}`;
}

function detectCreditType(line: string): CompletedCourse["creditType"] {
  const lower = line.toLowerCase();
  if (lower.includes("advanced placement") || /\bap\b/.test(lower)) return "ap";
  if (lower.includes("international baccalaureate") || /\bib\b/.test(lower)) return "ib";
  if (lower.includes("transfer") || lower.includes("transferred")) return "transfer";
  return "standard";
}

export function getDemoTranscript(): TranscriptParseResult {
  const completedCourses: CompletedCourse[] = [
    termCourse("MATH", "1225", "A", 4, "Fall 2023"),
    termCourse("ENGL", "1105", "A-", 3, "Fall 2023"),
    termCourse("CS", "1114", "A", 3, "Fall 2023"),
    termCourse("MATH", "1226", "B+", 4, "Spring 2024"),
    termCourse("CS", "2114", "A-", 3, "Spring 2024"),
    termCourse("ENGE", "1215", "B", 2, "Spring 2024"),
    termCourse("STAT", "4604", "B+", 3, "Fall 2024", "ap"),
    termCourse("CS", "2505", "A", 3, "Fall 2024"),
    termCourse("CS", "2506", "A-", 3, "Fall 2024"),
    termCourse("MATH", "2534", "B", 3, "Spring 2025"),
    termCourse("CS", "3114", "B+", 3, "Spring 2025"),
    termCourse("CS", "3214", "A-", 3, "Spring 2025"),
  ];

  return {
    completedCourses,
    inProgressCourses: ["CS-3304", "CS-3704", "MATH-3034"],
    major: "Computer Science",
    minors: [],
    catalogYear: "2023-2024",
    usedDemoFallback: true,
  };
}

function termCourse(
  subject: string,
  number: string,
  grade: string,
  credits: number,
  termLabel: string,
  creditType: CompletedCourse["creditType"] = "standard"
): CompletedCourse {
  const term = termFromLabel(termLabel);
  if (!term) {
    throw new Error(`Invalid demo term label: ${termLabel}`);
  }
  return {
    courseId: normalizeCourseId(subject, number),
    grade,
    term,
    credits,
    creditType,
  };
}

export function parseVtTranscriptText(text: string): TranscriptParseResult | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return null;

  const completedCourses: CompletedCourse[] = [];
  const inProgressCourses: string[] = [];
  let major: string | undefined;
  let catalogYear: string | undefined;
  const minors: string[] = [];

  const majorMatch = text.match(/(?:Major|Primary Major|Degree)\s*:?\s*([A-Za-z][A-Za-z\s/&-]+)/i);
  if (majorMatch) {
    major = majorMatch[1].trim();
  }

  const catalogMatch = text.match(/Catalog\s+Year\s*:?\s*(\d{4}\s*[-–]\s*\d{4})/i);
  if (catalogMatch) {
    catalogYear = catalogMatch[1].replace(/\s+/g, "");
  }

  const minorMatches = text.matchAll(/Minor\s*:?\s*([A-Za-z][A-Za-z\s/&-]+)/gi);
  for (const match of minorMatches) {
    minors.push(match[1].trim());
  }

  const courseLine =
    /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+([A-F][+-]?|P|W|I|NR|--)\s+(Fall|Spring|Summer)\s+(\d{4})/i;
  const inProgressLine =
    /^([A-Z]{2,4})\s+(\d{4}[A-Z]?)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(?:In\s+Progress|IP|--)\s+(Fall|Spring|Summer)\s+(\d{4})/i;

  for (const line of lines) {
    const inProgress = line.match(inProgressLine);
    if (inProgress) {
      inProgressCourses.push(normalizeCourseId(inProgress[1], inProgress[2]));
      continue;
    }

    const match = line.match(courseLine);
    if (!match) continue;

    const [, subject, number, , creditsRaw, grade, termName, yearRaw] = match;
    const term = termFromLabel(`${termName} ${yearRaw}`);
    if (!term) continue;

    const courseId = normalizeCourseId(subject, number);
    const credits = Number.parseFloat(creditsRaw);

    if (grade === "--" || grade.toUpperCase() === "IP") {
      inProgressCourses.push(courseId);
      continue;
    }

    completedCourses.push({
      courseId,
      grade: grade.toUpperCase(),
      term,
      credits,
      creditType: detectCreditType(line),
    });
  }

  if (completedCourses.length === 0 && inProgressCourses.length === 0) {
    return null;
  }

  return {
    completedCourses,
    inProgressCourses: [...new Set(inProgressCourses)],
    major,
    minors: minors.length > 0 ? minors : undefined,
    catalogYear,
  };
}
