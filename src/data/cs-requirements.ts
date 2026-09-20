import type { RequirementBlock, CourseInfo, CompletedCourse, Prerequisite } from "@/types/contracts";

function cid(subject: string, number: string): string {
  return `${subject}-${number}`;
}

function p(courseId: string, minGrade = "C-"): Prerequisite {
  return { courseId, minGrade };
}

function buildCourseCatalog(): Record<string, CourseInfo> {
  const courses: CourseInfo[] = [
    // CS Core
    { id: cid("CS", "1114"), subject: "CS", number: "1114", title: "Introduction to Software Design", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("CS", "2104"), subject: "CS", number: "2104", title: "Introduction to Problem Solving in Computer Science", credits: 3, prerequisites: [p(cid("CS", "1114"))], corequisites: [] },
    { id: cid("CS", "2114"), subject: "CS", number: "2114", title: "Software Design and Data Structures", credits: 3, prerequisites: [p(cid("CS", "1114"))], corequisites: [] },
    { id: cid("CS", "2505"), subject: "CS", number: "2505", title: "Introduction to Computer Organization", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "2506"), subject: "CS", number: "2506", title: "Introduction to Computer Organization II", credits: 3, prerequisites: [p(cid("CS", "2505"))], corequisites: [] },
    { id: cid("CS", "3114"), subject: "CS", number: "3114", title: "Data Structures and Algorithms", credits: 3, prerequisites: [p(cid("CS", "2114")), p(cid("CS", "2505"))], corequisites: [] },
    { id: cid("CS", "3214"), subject: "CS", number: "3214", title: "Computer Systems", credits: 3, prerequisites: [p(cid("CS", "2506")), p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "3304"), subject: "CS", number: "3304", title: "Comparative Languages", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4104"), subject: "CS", number: "4104", title: "Theory of Computation", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("MATH", "2534"))], corequisites: [] },
    { id: cid("CS", "4114"), subject: "CS", number: "4114", title: "Formal Languages and Automata", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("MATH", "2534"))], corequisites: [] },
    // CS Electives
    { id: cid("CS", "3744"), subject: "CS", number: "3744", title: "Introduction to Human-Computer Interaction", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4254"), subject: "CS", number: "4254", title: "Computer Network Architecture and Programming", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4264"), subject: "CS", number: "4264", title: "Principles of Computer Security", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4284"), subject: "CS", number: "4284", title: "Systems and Networking Capstone", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4604"), subject: "CS", number: "4604", title: "Introduction to Database Systems", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "4624"), subject: "CS", number: "4624", title: "Machine Learning", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("MATH", "2204"))], corequisites: [] },
    { id: cid("CS", "4644"), subject: "CS", number: "4644", title: "Creative Computing Studio", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4654"), subject: "CS", number: "4654", title: "Data Mining", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("STAT", "4705"))], corequisites: [] },
    { id: cid("CS", "4784"), subject: "CS", number: "4784", title: "Parallel Programming", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    // Math (major + minor)
    { id: cid("MATH", "1225"), subject: "MATH", number: "1225", title: "Calculus of a Single Variable", credits: 4, prerequisites: [], corequisites: [] },
    { id: cid("MATH", "1226"), subject: "MATH", number: "1226", title: "Calculus of a Single Variable", credits: 4, prerequisites: [p(cid("MATH", "1225"))], corequisites: [] },
    { id: cid("MATH", "2114"), subject: "MATH", number: "2114", title: "Introduction to Linear Algebra", credits: 3, prerequisites: [p(cid("MATH", "1226"))], corequisites: [] },
    { id: cid("MATH", "2204"), subject: "MATH", number: "2204", title: "Introduction to Multivariable Calculus", credits: 3, prerequisites: [p(cid("MATH", "1226"))], corequisites: [] },
    { id: cid("MATH", "2534"), subject: "MATH", number: "2534", title: "Introduction to Discrete Mathematics", credits: 3, prerequisites: [p(cid("MATH", "1226"))], corequisites: [] },
    { id: cid("MATH", "3214"), subject: "MATH", number: "3214", title: "Introduction to Real Analysis", credits: 3, prerequisites: [p(cid("MATH", "2114")), p(cid("MATH", "2204"))], corequisites: [] },
    { id: cid("MATH", "4225"), subject: "MATH", number: "4225", title: "Elementary Real Analysis", credits: 3, prerequisites: [p(cid("MATH", "3214"))], corequisites: [] },
    // Statistics
    { id: cid("STAT", "4705"), subject: "STAT", number: "4705", title: "Statistics for Engineers", credits: 3, prerequisites: [p(cid("MATH", "1226"))], corequisites: [] },
    { id: cid("STAT", "4714"), subject: "STAT", number: "4714", title: "Probability and Statistics for Engineers", credits: 3, prerequisites: [p(cid("MATH", "1226"))], corequisites: [] },
    // Science
    { id: cid("PHYS", "2305"), subject: "PHYS", number: "2305", title: "Foundations of Physics", credits: 4, prerequisites: [p(cid("MATH", "1225"))], corequisites: [] },
    { id: cid("PHYS", "2306"), subject: "PHYS", number: "2306", title: "Foundations of Physics", credits: 4, prerequisites: [p(cid("PHYS", "2305")), p(cid("MATH", "1226"))], corequisites: [] },
    { id: cid("CHEM", "1035"), subject: "CHEM", number: "1035", title: "General Chemistry", credits: 3, prerequisites: [], corequisites: [cid("CHEM", "1045")] },
    { id: cid("CHEM", "1045"), subject: "CHEM", number: "1045", title: "General Chemistry Laboratory", credits: 1, prerequisites: [], corequisites: [cid("CHEM", "1035")] },
    { id: cid("BIOL", "1105"), subject: "BIOL", number: "1105", title: "Principles of Biology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("BIOL", "1106"), subject: "BIOL", number: "1106", title: "Principles of Biology", credits: 3, prerequisites: [p(cid("BIOL", "1105"))], corequisites: [] },
    // Pathways / gen ed
    { id: cid("ENGL", "1105"), subject: "ENGL", number: "1105", title: "First-Year Writing", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ENGL", "1106"), subject: "ENGL", number: "1106", title: "First-Year Writing", credits: 3, prerequisites: [p(cid("ENGL", "1105"))], corequisites: [] },
    { id: cid("COMM", "1016"), subject: "COMM", number: "1016", title: "Introduction to Communication", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PHIL", "2014"), subject: "PHIL", number: "2014", title: "Introduction to Philosophy", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PSYC", "2004"), subject: "PSYC", number: "2004", title: "Introductory Psychology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("SOC", "1004"), subject: "SOC", number: "1004", title: "Introductory Sociology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PSCI", "1014"), subject: "PSCI", number: "1014", title: "Introduction to Political Science", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEO", "1004"), subject: "GEO", number: "1004", title: "Physical Geography", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ART", "1014"), subject: "ART", number: "1014", title: "Introduction to Visual Arts", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("MUS", "1014"), subject: "MUS", number: "1014", title: "Music Appreciation", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("FL", "2104"), subject: "FL", number: "2104", title: "Intermediate Language Study", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEO", "2404"), subject: "GEO", number: "2404", title: "World Regions", credits: 3, prerequisites: [], corequisites: [] },
  ];

  const map: Record<string, CourseInfo> = {};
  for (const c of courses) {
    map[c.id] = c;
  }
  return map;
}

function buildPrerequisiteGraph(courseDetails: Record<string, CourseInfo>): Record<string, string[]> {
  const graph: Record<string, string[]> = {};
  for (const [id, course] of Object.entries(courseDetails)) {
    graph[id] = course.prerequisites.map((pr) => pr.courseId);
  }
  return graph;
}

function buildRequirementBlocks(
  completedIds: Set<string>
): RequirementBlock[] {
  const satisfied = (eligible: string[]) => eligible.filter((id) => completedIds.has(id));

  const csCoreEligible = [
    cid("CS", "1114"), cid("CS", "2104"), cid("CS", "2114"), cid("CS", "2505"), cid("CS", "2506"),
    cid("CS", "3114"), cid("CS", "3214"), cid("CS", "3304"), cid("CS", "4104"), cid("CS", "4114"),
  ];
  const csCoreSat = satisfied(csCoreEligible);

  const csElectiveEligible = [
    cid("CS", "3744"), cid("CS", "4254"), cid("CS", "4264"), cid("CS", "4284"), cid("CS", "4604"),
    cid("CS", "4624"), cid("CS", "4644"), cid("CS", "4654"), cid("CS", "4784"),
  ];
  const csElectiveSat = satisfied(csElectiveEligible);

  const mathMajorEligible = [
    cid("MATH", "1225"), cid("MATH", "1226"), cid("MATH", "2114"), cid("MATH", "2204"),
  ];
  const mathMajorSat = satisfied(mathMajorEligible);

  const statEligible = [cid("STAT", "4705"), cid("STAT", "4714")];
  const statSat = satisfied(statEligible);

  const scienceEligible = [
    cid("PHYS", "2305"), cid("PHYS", "2306"),
    cid("CHEM", "1035"), cid("CHEM", "1045"), cid("BIOL", "1105"), cid("BIOL", "1106"),
  ];
  const scienceSat = satisfied(scienceEligible);

  const minorEligible = [
    cid("MATH", "1225"), cid("MATH", "1226"), cid("MATH", "2114"), cid("MATH", "2204"),
    cid("MATH", "3214"), cid("MATH", "4225"),
  ];
  const minorSat = satisfied(minorEligible);

  const blocks: RequirementBlock[] = [
    {
      id: "cs-core",
      name: "CS Core",
      category: "major",
      requiredCredits: 33,
      coursesNeeded: csCoreEligible.length,
      eligibleCourses: csCoreEligible,
      satisfiedBy: csCoreSat,
      remaining: csCoreEligible.length - csCoreSat.length,
    },
    {
      id: "cs-electives",
      name: "CS Technical Electives",
      category: "elective",
      requiredCredits: 9,
      coursesNeeded: 3,
      eligibleCourses: csElectiveEligible,
      satisfiedBy: csElectiveSat,
      remaining: Math.max(0, 3 - csElectiveSat.length),
    },
    {
      id: "math-major",
      name: "Mathematics for CS",
      category: "major",
      requiredCredits: 14,
      coursesNeeded: mathMajorEligible.length,
      eligibleCourses: mathMajorEligible,
      satisfiedBy: mathMajorSat,
      remaining: mathMajorEligible.length - mathMajorSat.length,
    },
    {
      id: "statistics",
      name: "Statistics Requirement",
      category: "major",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: statEligible,
      satisfiedBy: statSat,
      remaining: statSat.length >= 1 ? 0 : 1,
    },
    {
      id: "science",
      name: "Science Sequence",
      category: "major",
      requiredCredits: 8,
      coursesNeeded: 2,
      eligibleCourses: scienceEligible,
      satisfiedBy: scienceSat,
      remaining: 2,
    },
    {
      id: "pathways-1",
      name: "Pathways 1 — Writing and Rhetoric",
      category: "pathways",
      requiredCredits: 6,
      coursesNeeded: 2,
      eligibleCourses: [cid("ENGL", "1105"), cid("ENGL", "1106")],
      satisfiedBy: satisfied([cid("ENGL", "1105"), cid("ENGL", "1106")]),
      remaining: Math.max(0, 2 - satisfied([cid("ENGL", "1105"), cid("ENGL", "1106")]).length),
    },
    {
      id: "pathways-2",
      name: "Pathways 2 — Critical Thinking in the Humanities",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("PHIL", "2014"), cid("PSYC", "2004"), cid("COMM", "1016")],
      satisfiedBy: satisfied([cid("PHIL", "2014"), cid("PSYC", "2004"), cid("COMM", "1016")]),
      remaining: satisfied([cid("PHIL", "2014"), cid("PSYC", "2004"), cid("COMM", "1016")]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-3",
      name: "Pathways 3 — Reasoning in the Social Sciences",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("SOC", "1004"), cid("PSCI", "1014")],
      satisfiedBy: satisfied([cid("SOC", "1004"), cid("PSCI", "1014")]),
      remaining: satisfied([cid("SOC", "1004"), cid("PSCI", "1014")]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-4",
      name: "Pathways 4 — Reasoning in the Natural Sciences",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("GEO", "1004"), cid("BIOL", "1105")],
      satisfiedBy: satisfied([cid("GEO", "1004"), cid("BIOL", "1105")]),
      remaining: satisfied([cid("GEO", "1004"), cid("BIOL", "1105")]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-5",
      name: "Pathways 5 — Quantitative and Computational Thinking",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("MATH", "1225"), cid("STAT", "4705")],
      satisfiedBy: satisfied([cid("MATH", "1225"), cid("STAT", "4705")]),
      remaining: satisfied([cid("MATH", "1225"), cid("STAT", "4705")]).length >= 1 ? 0 : 1,
      canDoubleCount: ["math-major"],
    },
    {
      id: "pathways-6",
      name: "Pathways 6 — Critique and Practice in Design and the Arts",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("ART", "1014"), cid("MUS", "1014")],
      satisfiedBy: satisfied([cid("ART", "1014"), cid("MUS", "1014")]),
      remaining: satisfied([cid("ART", "1014"), cid("MUS", "1014")]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-7",
      name: "Pathways 7 — Critical Analysis of Identity and Equity",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [cid("FL", "2104"), cid("GEO", "2404"), cid("SOC", "1004")],
      satisfiedBy: satisfied([cid("FL", "2104"), cid("GEO", "2404"), cid("SOC", "1004")]),
      remaining: satisfied([cid("FL", "2104"), cid("GEO", "2404"), cid("SOC", "1004")]).length >= 1 ? 0 : 1,
    },
    {
      id: "minor-math",
      name: "Minor: Mathematics",
      category: "minor",
      requiredCredits: 18,
      coursesNeeded: 6,
      eligibleCourses: minorEligible,
      satisfiedBy: minorSat,
      remaining: Math.max(0, 6 - minorSat.length),
      canDoubleCount: ["math-major"],
    },
  ];

  // Science block: need physics pair OR chem pair OR bio pair — simplify remaining count
  const hasPhys = completedIds.has(cid("PHYS", "2305")) && completedIds.has(cid("PHYS", "2306"));
  const hasChem = completedIds.has(cid("CHEM", "1035")) && completedIds.has(cid("CHEM", "1045"));
  const hasBio = completedIds.has(cid("BIOL", "1105")) && completedIds.has(cid("BIOL", "1106"));
  const scienceBlock = blocks.find((b) => b.id === "science");
  if (scienceBlock) {
    scienceBlock.satisfiedBy = scienceSat;
    scienceBlock.remaining = hasPhys || hasChem || hasBio ? 0 : 2;
  }

  return blocks;
}

export function getCSRequirements(
  catalogYear: string,
  completedCourses: CompletedCourse[],
  _inProgressCourses: string[]
): {
  requirementBlocks: RequirementBlock[];
  courseDetails: Record<string, CourseInfo>;
  prerequisiteGraph: Record<string, string[]>;
} {
  void catalogYear; // Demo data targets 2023–2024 checksheet; other years use the same catalog.
  const courseDetails = buildCourseCatalog();
  const prerequisiteGraph = buildPrerequisiteGraph(courseDetails);
  const completedIds = new Set(completedCourses.map((c) => c.courseId));
  const requirementBlocks = buildRequirementBlocks(completedIds);

  return { requirementBlocks, courseDetails, prerequisiteGraph };
}
