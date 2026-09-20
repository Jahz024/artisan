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

export interface DemoPreset {
  id: string;
  label: string;
  emoji: string;
  description: string;
  major: string;
  year: "freshman" | "sophomore" | "junior";
  targetGrad: { year: number; termType: "spring" | "fall"; label: string };
}

export const DEMO_PRESETS: DemoPreset[] = [
  { id: "cs-freshman", label: "CS Freshman", emoji: "💻", description: "Brand new, AP Calc credit", major: "Computer Science", year: "freshman", targetGrad: { year: 2030, termType: "spring", label: "Spring 2030" } },
  { id: "cs-sophomore", label: "CS Sophomore", emoji: "📚", description: "Finished core math & intro CS", major: "Computer Science", year: "sophomore", targetGrad: { year: 2029, termType: "spring", label: "Spring 2029" } },
  { id: "cs-junior", label: "CS Junior", emoji: "🎓", description: "Deep in systems & algorithms", major: "Computer Science", year: "junior", targetGrad: { year: 2028, termType: "spring", label: "Spring 2028" } },
  { id: "cyber-sophomore", label: "Cybersecurity Soph", emoji: "🔐", description: "Security-focused, strong math", major: "Computer Science — Secure Computing", year: "sophomore", targetGrad: { year: 2029, termType: "spring", label: "Spring 2029" } },
  { id: "ds-junior", label: "Data Science Junior", emoji: "📊", description: "Stats + ML track, minor in Math", major: "Computer Science — Data Analytics", year: "junior", targetGrad: { year: 2028, termType: "spring", label: "Spring 2028" } },
  { id: "eng-freshman", label: "Gen. Engineering", emoji: "⚙️", description: "Undecided engineering, physics heavy", major: "General Engineering", year: "freshman", targetGrad: { year: 2030, termType: "spring", label: "Spring 2030" } },
];

export type DemoProfile = string; // preset id

export function getDemoTranscript(profileId: DemoProfile = "cs-junior"): TranscriptParseResult {
  switch (profileId) {
    case "cs-freshman": return buildDemoCSFreshman();
    case "cs-sophomore": return buildDemoCSSoph();
    case "cs-junior": return buildDemoCSJunior();
    case "cyber-sophomore": return buildDemoCyberSoph();
    case "ds-junior": return buildDemoDSJunior();
    case "eng-freshman": return buildDemoEngFreshman();
    default: return buildDemoCSJunior();
  }
}

function preset(id: string): DemoPreset {
  return DEMO_PRESETS.find((p) => p.id === id)!;
}

/* ═══════════════ CS Freshman ═══════════════ */
function buildDemoCSFreshman(): TranscriptParseResult {
  const p = preset("cs-freshman");
  return {
    completedCourses: [
      termCourse("MATH", "1225", "A", 4, "Fall 2026", "ap"),
    ],
    inProgressCourses: ["CS-1114", "ENGL-1105", "MATH-1226"],
    major: p.major,
    minors: [],
    catalogYear: "2026-2027",
    usedDemoFallback: true,
  };
}

/* ═══════════════ CS Sophomore ═══════════════ */
function buildDemoCSSoph(): TranscriptParseResult {
  const p = preset("cs-sophomore");
  return {
    completedCourses: [
      termCourse("MATH", "1225", "A", 4, "Fall 2025"),
      termCourse("ENGL", "1105", "A-", 3, "Fall 2025"),
      termCourse("CS", "1114", "A", 3, "Fall 2025"),
      termCourse("PHYS", "2305", "B+", 4, "Fall 2025"),
      termCourse("COMM", "1016", "A", 3, "Fall 2025"),
      termCourse("MATH", "1226", "B+", 4, "Spring 2026"),
      termCourse("CS", "2114", "A-", 3, "Spring 2026"),
      termCourse("ENGL", "1106", "B", 3, "Spring 2026"),
      termCourse("PHYS", "2306", "B", 4, "Spring 2026"),
      termCourse("ENGE", "1215", "A", 2, "Spring 2026"),
    ],
    inProgressCourses: ["CS-2505", "MATH-2534", "STAT-4705"],
    major: p.major,
    minors: [],
    catalogYear: "2025-2026",
    usedDemoFallback: true,
  };
}

/* ═══════════════ CS Junior ═══════════════ */
function buildDemoCSJunior(): TranscriptParseResult {
  const p = preset("cs-junior");
  return {
    completedCourses: [
      // Fall 2024 — 17cr
      termCourse("MATH", "1225", "A", 4, "Fall 2024"),
      termCourse("ENGL", "1105", "A-", 3, "Fall 2024"),
      termCourse("CS", "1114", "A", 3, "Fall 2024"),
      termCourse("PHYS", "2305", "B+", 4, "Fall 2024"),
      termCourse("COMM", "1016", "A", 3, "Fall 2024"),
      // Spring 2025 — 19cr
      termCourse("MATH", "1226", "B+", 4, "Spring 2025"),
      termCourse("CS", "2114", "A-", 3, "Spring 2025"),
      termCourse("ENGL", "1106", "B", 3, "Spring 2025"),
      termCourse("PHYS", "2306", "B", 4, "Spring 2025"),
      termCourse("ENGE", "1215", "A", 2, "Spring 2025"),
      termCourse("PSYC", "2004", "A-", 3, "Spring 2025", "ap"),
      // Fall 2025 — 18cr
      termCourse("CS", "2505", "A", 3, "Fall 2025"),
      termCourse("MATH", "2534", "B", 3, "Fall 2025"),
      termCourse("MATH", "2114", "B+", 3, "Fall 2025"),
      termCourse("STAT", "4604", "B+", 3, "Fall 2025", "ap"),
      termCourse("SOC", "1004", "A-", 3, "Fall 2025"),
      termCourse("ART", "1014", "A", 3, "Fall 2025"),
      // Spring 2026 — 18cr
      termCourse("CS", "2506", "A-", 3, "Spring 2026"),
      termCourse("CS", "3114", "B+", 3, "Spring 2026"),
      termCourse("MATH", "2204", "B", 3, "Spring 2026"),
      termCourse("GEO", "1004", "A", 3, "Spring 2026"),
      termCourse("FL", "2104", "B+", 3, "Spring 2026"),
      termCourse("PHIL", "2014", "A-", 3, "Spring 2026"),
    ],
    inProgressCourses: ["CS-3214", "CS-3304", "STAT-4705"],
    major: p.major,
    minors: [],
    catalogYear: "2024-2025",
    usedDemoFallback: true,
  };
}

/* ═══════════════ Cybersecurity Sophomore ═══════════════ */
function buildDemoCyberSoph(): TranscriptParseResult {
  const p = preset("cyber-sophomore");
  return {
    completedCourses: [
      termCourse("MATH", "1225", "A-", 4, "Fall 2025"),
      termCourse("CS", "1114", "B+", 3, "Fall 2025"),
      termCourse("ENGL", "1105", "A", 3, "Fall 2025"),
      termCourse("PHYS", "2305", "B", 4, "Fall 2025"),
      termCourse("PSCI", "1014", "A", 3, "Fall 2025"),
      termCourse("MATH", "1226", "A-", 4, "Spring 2026"),
      termCourse("CS", "2114", "A", 3, "Spring 2026"),
      termCourse("MATH", "2534", "B+", 3, "Spring 2026"),
      termCourse("ENGL", "1106", "B+", 3, "Spring 2026"),
      termCourse("ENGE", "1215", "B+", 2, "Spring 2026"),
    ],
    inProgressCourses: ["CS-2505", "STAT-4705", "PHYS-2306"],
    major: p.major,
    minors: [],
    catalogYear: "2025-2026",
    usedDemoFallback: true,
  };
}

/* ═══════════════ Data Science Junior ═══════════════ */
function buildDemoDSJunior(): TranscriptParseResult {
  const p = preset("ds-junior");
  return {
    completedCourses: [
      // Fall 2024 — 17cr
      termCourse("MATH", "1225", "A", 4, "Fall 2024"),
      termCourse("CS", "1114", "A-", 3, "Fall 2024"),
      termCourse("ENGL", "1105", "B+", 3, "Fall 2024"),
      termCourse("CHEM", "1035", "B", 3, "Fall 2024"),
      termCourse("CHEM", "1045", "A", 1, "Fall 2024"),
      termCourse("COMM", "1016", "A", 3, "Fall 2024"),
      // Spring 2025 — 18cr
      termCourse("MATH", "1226", "A", 4, "Spring 2025"),
      termCourse("CS", "2114", "B+", 3, "Spring 2025"),
      termCourse("STAT", "4705", "A-", 3, "Spring 2025"),
      termCourse("ENGL", "1106", "A-", 3, "Spring 2025"),
      termCourse("ENGE", "1215", "A", 2, "Spring 2025"),
      termCourse("SOC", "1004", "A", 3, "Spring 2025"),
      // Fall 2025 — 18cr
      termCourse("CS", "2505", "B+", 3, "Fall 2025"),
      termCourse("MATH", "2534", "A-", 3, "Fall 2025"),
      termCourse("MATH", "2114", "A", 3, "Fall 2025"),
      termCourse("MATH", "2204", "B+", 3, "Fall 2025"),
      termCourse("PSYC", "2004", "B+", 3, "Fall 2025"),
      termCourse("ART", "1014", "A-", 3, "Fall 2025"),
      // Spring 2026 — 18cr
      termCourse("CS", "2506", "B+", 3, "Spring 2026"),
      termCourse("CS", "3114", "A", 3, "Spring 2026"),
      termCourse("STAT", "4714", "A-", 3, "Spring 2026"),
      termCourse("GEO", "1004", "B+", 3, "Spring 2026"),
      termCourse("PHIL", "2014", "A", 3, "Spring 2026"),
      termCourse("FL", "2104", "B+", 3, "Spring 2026"),
    ],
    inProgressCourses: ["CS-3214", "CS-4604", "CS-3304"],
    major: p.major,
    minors: ["Mathematics"],
    catalogYear: "2024-2025",
    usedDemoFallback: true,
  };
}

/* ═══════════════ General Engineering Freshman ═══════════════ */
function buildDemoEngFreshman(): TranscriptParseResult {
  const p = preset("eng-freshman");
  return {
    completedCourses: [
      termCourse("MATH", "1225", "A-", 4, "Fall 2026", "ap"),
      termCourse("PHYS", "2305", "B+", 4, "Fall 2026", "ap"),
    ],
    inProgressCourses: ["MATH-1226", "ENGL-1105", "CS-1114"],
    major: p.major,
    minors: [],
    catalogYear: "2026-2027",
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
