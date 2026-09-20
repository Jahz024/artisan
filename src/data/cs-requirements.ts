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
    // CS Electives (expanded — all 3000/4000-level CS that VT offers)
    { id: cid("CS", "3704"), subject: "CS", number: "3704", title: "Intermediate Software Design and Engineering", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "3744"), subject: "CS", number: "3744", title: "Introduction to Human-Computer Interaction", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "3654"), subject: "CS", number: "3654", title: "Intro to Data Analytics and Visualization", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4204"), subject: "CS", number: "4204", title: "Computer Graphics", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("MATH", "2204"))], corequisites: [] },
    { id: cid("CS", "4254"), subject: "CS", number: "4254", title: "Computer Network Architecture and Programming", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4264"), subject: "CS", number: "4264", title: "Principles of Computer Security", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4274"), subject: "CS", number: "4274", title: "Introduction to Cryptography", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "4284"), subject: "CS", number: "4284", title: "Systems and Networking Capstone", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4304"), subject: "CS", number: "4304", title: "Compiler Design and Implementation", credits: 3, prerequisites: [p(cid("CS", "3304"))], corequisites: [] },
    { id: cid("CS", "4414"), subject: "CS", number: "4414", title: "Issues in Computer Science", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4604"), subject: "CS", number: "4604", title: "Introduction to Database Systems", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "4624"), subject: "CS", number: "4624", title: "Machine Learning", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("MATH", "2204"))], corequisites: [] },
    { id: cid("CS", "4634"), subject: "CS", number: "4634", title: "Design of Information", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4644"), subject: "CS", number: "4644", title: "Creative Computing Studio", credits: 3, prerequisites: [p(cid("CS", "2114"))], corequisites: [] },
    { id: cid("CS", "4654"), subject: "CS", number: "4654", title: "Intermediate Data Analytics and Machine Learning", credits: 3, prerequisites: [p(cid("CS", "3114")), p(cid("STAT", "4705"))], corequisites: [] },
    { id: cid("CS", "4784"), subject: "CS", number: "4784", title: "Parallel Programming", credits: 3, prerequisites: [p(cid("CS", "3214"))], corequisites: [] },
    { id: cid("CS", "4804"), subject: "CS", number: "4804", title: "Introduction to Artificial Intelligence", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "4824"), subject: "CS", number: "4824", title: "Machine Learning with Big Data", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
    { id: cid("CS", "4884"), subject: "CS", number: "4884", title: "Computational Biology", credits: 3, prerequisites: [p(cid("CS", "3114"))], corequisites: [] },
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
    // ─── Pathways / gen-ed (massively expanded to match real VT catalog) ───
    // Pathways 1 — Writing
    { id: cid("ENGL", "1105"), subject: "ENGL", number: "1105", title: "First-Year Writing", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ENGL", "1106"), subject: "ENGL", number: "1106", title: "First-Year Writing", credits: 3, prerequisites: [p(cid("ENGL", "1105"))], corequisites: [] },
    // Pathways 2 — Humanities
    { id: cid("COMM", "1016"), subject: "COMM", number: "1016", title: "Introduction to Communication", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PHIL", "2014"), subject: "PHIL", number: "2014", title: "Introduction to Philosophy", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PHIL", "1304"), subject: "PHIL", number: "1304", title: "Knowledge and Reality", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PHIL", "1204"), subject: "PHIL", number: "1204", title: "Moral Reasoning", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HIST", "1114"), subject: "HIST", number: "1114", title: "United States History to 1865", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HIST", "1214"), subject: "HIST", number: "1214", title: "United States History Since 1865", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HIST", "1024"), subject: "HIST", number: "1024", title: "Intro to World History", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ENGL", "2014"), subject: "ENGL", number: "2014", title: "Introduction to Literature", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ENGL", "2114"), subject: "ENGL", number: "2114", title: "Reading and Writing about Literature", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("REL", "1014"), subject: "REL", number: "1014", title: "Introduction to Religion", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HUM", "1204"), subject: "HUM", number: "1204", title: "Humanities Seminar", credits: 3, prerequisites: [], corequisites: [] },
    // Pathways 3 — Social Sciences
    { id: cid("PSYC", "2004"), subject: "PSYC", number: "2004", title: "Introductory Psychology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("SOC", "1004"), subject: "SOC", number: "1004", title: "Introductory Sociology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PSCI", "1014"), subject: "PSCI", number: "1014", title: "Introduction to Political Science", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ECON", "2005"), subject: "ECON", number: "2005", title: "Principles of Economics", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ECON", "2006"), subject: "ECON", number: "2006", title: "Principles of Economics", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("AAEC", "1005"), subject: "AAEC", number: "1005", title: "Agriculture in a Global Context", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEOG", "1014"), subject: "GEOG", number: "1014", title: "Introduction to Geography", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("UAP", "1024"), subject: "UAP", number: "1024", title: "Intro to Urban Affairs", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PSCI", "1024"), subject: "PSCI", number: "1024", title: "Government and Politics", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("IS", "2054"), subject: "IS", number: "2054", title: "Global Cultures", credits: 3, prerequisites: [], corequisites: [] },
    // Pathways 4 — Natural Sciences
    { id: cid("GEO", "1004"), subject: "GEO", number: "1004", title: "Physical Geography", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEOS", "1004"), subject: "GEOS", number: "1004", title: "Physical Geology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ISE", "1004"), subject: "ISE", number: "1004", title: "Intro to Industrial and Systems Engineering", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("BIOL", "1004"), subject: "BIOL", number: "1004", title: "General Biology", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEOS", "1024"), subject: "GEOS", number: "1024", title: "Earth Materials and Resources", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("BIOL", "1014"), subject: "BIOL", number: "1014", title: "Principles of Biology for Non-Majors", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("PHYS", "1055"), subject: "PHYS", number: "1055", title: "Physics of Today's World", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("NR", "1004"), subject: "NR", number: "1004", title: "Earth, Life, and Time", credits: 3, prerequisites: [], corequisites: [] },
    // Pathways 6 — Design and Arts
    { id: cid("ART", "1014"), subject: "ART", number: "1014", title: "Introduction to Visual Arts", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ART", "1044"), subject: "ART", number: "1044", title: "Intro to Digital Art", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("MUS", "1014"), subject: "MUS", number: "1014", title: "Music Appreciation", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("MUS", "1054"), subject: "MUS", number: "1054", title: "World Music", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("TA", "1014"), subject: "TA", number: "1014", title: "Introduction to Theatre", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("TA", "1044"), subject: "TA", number: "1044", title: "Dramatic Art and Society", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ARCH", "1016"), subject: "ARCH", number: "1016", title: "Intro to Architecture and Design", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("CINE", "2054"), subject: "CINE", number: "2054", title: "Introduction to Cinema", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("CINE", "2064"), subject: "CINE", number: "2064", title: "Digital Filmmaking", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("CREA", "2184"), subject: "CREA", number: "2184", title: "Creative Technologies", credits: 3, prerequisites: [], corequisites: [] },
    // Pathways 7 — Identity and Equity
    { id: cid("FL", "2104"), subject: "FL", number: "2104", title: "Intermediate Language Study", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("GEO", "2404"), subject: "GEO", number: "2404", title: "World Regions", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("AFST", "1024"), subject: "AFST", number: "1024", title: "Intro to Africana Studies", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("WGS", "1024"), subject: "WGS", number: "1024", title: "Intro to Women's and Gender Studies", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("RLCL", "1014"), subject: "RLCL", number: "1014", title: "Religion and Culture", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("SPAN", "2104"), subject: "SPAN", number: "2104", title: "Intermediate Spanish", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("AINS", "1024"), subject: "AINS", number: "1024", title: "Intro to American Indian Studies", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ALCE", "1004"), subject: "ALCE", number: "1004", title: "Learning and Culture in Education", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("APSC", "1024"), subject: "APSC", number: "1024", title: "Appalachian Studies", credits: 3, prerequisites: [], corequisites: [] },
    // Free elective options (popular low-prereq courses)
    { id: cid("ENGE", "1024"), subject: "ENGE", number: "1024", title: "Engineering Exploration", credits: 2, prerequisites: [], corequisites: [] },
    { id: cid("ENGE", "1215"), subject: "ENGE", number: "1215", title: "Foundations of Engineering", credits: 2, prerequisites: [], corequisites: [] },
    { id: cid("UNIV", "1004"), subject: "UNIV", number: "1004", title: "University Seminar", credits: 1, prerequisites: [], corequisites: [] },
    { id: cid("LDRS", "1015"), subject: "LDRS", number: "1015", title: "Foundations of Leadership", credits: 1, prerequisites: [], corequisites: [] },
    { id: cid("HNFE", "1004"), subject: "HNFE", number: "1004", title: "Introduction to Human Nutrition", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HTM", "1014"), subject: "HTM", number: "1014", title: "Hospitality and Tourism Management", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("BIT", "2405"), subject: "BIT", number: "2405", title: "Intro to Business Analytics", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("ACIS", "1504"), subject: "ACIS", number: "1504", title: "Introduction to Business", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("EDCI", "1014"), subject: "EDCI", number: "1014", title: "Exploring Education", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("HD", "1004"), subject: "HD", number: "1004", title: "Introduction to Human Development", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("SPIA", "2004"), subject: "SPIA", number: "2004", title: "Public Policy", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("DASC", "1004"), subject: "DASC", number: "1004", title: "Intro to Data Science", credits: 3, prerequisites: [], corequisites: [] },
    { id: cid("CMDA", "2005"), subject: "CMDA", number: "2005", title: "Integrated Quantitative Sciences", credits: 3, prerequisites: [], corequisites: [] },
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
    cid("CS", "3704"), cid("CS", "3744"), cid("CS", "3654"),
    cid("CS", "4204"), cid("CS", "4254"), cid("CS", "4264"), cid("CS", "4274"), cid("CS", "4284"),
    cid("CS", "4304"), cid("CS", "4414"), cid("CS", "4604"), cid("CS", "4624"), cid("CS", "4634"),
    cid("CS", "4644"), cid("CS", "4654"), cid("CS", "4784"), cid("CS", "4804"), cid("CS", "4824"),
    cid("CS", "4884"),
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

  const freeElectiveEligible = [
    cid("ENGE", "1024"), cid("ENGE", "1215"), cid("UNIV", "1004"), cid("LDRS", "1015"),
    cid("HNFE", "1004"), cid("HTM", "1014"), cid("BIT", "2405"), cid("ACIS", "1504"),
    cid("EDCI", "1014"), cid("HD", "1004"), cid("SPIA", "2004"), cid("DASC", "1004"),
    cid("CMDA", "2005"),
    cid("PSYC", "2004"), cid("SOC", "1004"), cid("ECON", "2005"), cid("ECON", "2006"),
    cid("ART", "1014"), cid("MUS", "1014"), cid("COMM", "1016"),
  ];

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
      eligibleCourses: [
        cid("PHIL", "2014"), cid("PHIL", "1304"), cid("PHIL", "1204"),
        cid("PSYC", "2004"), cid("COMM", "1016"),
        cid("HIST", "1114"), cid("HIST", "1214"), cid("HIST", "1024"),
        cid("ENGL", "2014"), cid("ENGL", "2114"),
        cid("REL", "1014"), cid("HUM", "1204"),
      ],
      satisfiedBy: satisfied([
        cid("PHIL", "2014"), cid("PHIL", "1304"), cid("PHIL", "1204"),
        cid("PSYC", "2004"), cid("COMM", "1016"),
        cid("HIST", "1114"), cid("HIST", "1214"), cid("HIST", "1024"),
        cid("ENGL", "2014"), cid("ENGL", "2114"),
        cid("REL", "1014"), cid("HUM", "1204"),
      ]),
      remaining: satisfied([
        cid("PHIL", "2014"), cid("PHIL", "1304"), cid("PHIL", "1204"),
        cid("PSYC", "2004"), cid("COMM", "1016"),
        cid("HIST", "1114"), cid("HIST", "1214"), cid("HIST", "1024"),
        cid("ENGL", "2014"), cid("ENGL", "2114"),
        cid("REL", "1014"), cid("HUM", "1204"),
      ]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-3",
      name: "Pathways 3 — Reasoning in the Social Sciences",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [
        cid("SOC", "1004"), cid("PSCI", "1014"), cid("PSCI", "1024"),
        cid("ECON", "2005"), cid("ECON", "2006"),
        cid("AAEC", "1005"), cid("GEOG", "1014"),
        cid("UAP", "1024"), cid("IS", "2054"), cid("PSYC", "2004"),
      ],
      satisfiedBy: satisfied([
        cid("SOC", "1004"), cid("PSCI", "1014"), cid("PSCI", "1024"),
        cid("ECON", "2005"), cid("ECON", "2006"),
        cid("AAEC", "1005"), cid("GEOG", "1014"),
        cid("UAP", "1024"), cid("IS", "2054"), cid("PSYC", "2004"),
      ]),
      remaining: satisfied([
        cid("SOC", "1004"), cid("PSCI", "1014"), cid("PSCI", "1024"),
        cid("ECON", "2005"), cid("ECON", "2006"),
        cid("AAEC", "1005"), cid("GEOG", "1014"),
        cid("UAP", "1024"), cid("IS", "2054"), cid("PSYC", "2004"),
      ]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-4",
      name: "Pathways 4 — Reasoning in the Natural Sciences",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [
        cid("GEO", "1004"), cid("GEOS", "1004"), cid("GEOS", "1024"),
        cid("BIOL", "1105"), cid("BIOL", "1004"), cid("BIOL", "1014"),
        cid("CHEM", "1035"), cid("ISE", "1004"),
        cid("PHYS", "1055"), cid("NR", "1004"),
      ],
      satisfiedBy: satisfied([
        cid("GEO", "1004"), cid("GEOS", "1004"), cid("GEOS", "1024"),
        cid("BIOL", "1105"), cid("BIOL", "1004"), cid("BIOL", "1014"),
        cid("CHEM", "1035"), cid("ISE", "1004"),
        cid("PHYS", "1055"), cid("NR", "1004"),
      ]),
      remaining: satisfied([
        cid("GEO", "1004"), cid("GEOS", "1004"), cid("GEOS", "1024"),
        cid("BIOL", "1105"), cid("BIOL", "1004"), cid("BIOL", "1014"),
        cid("CHEM", "1035"), cid("ISE", "1004"),
        cid("PHYS", "1055"), cid("NR", "1004"),
      ]).length >= 1 ? 0 : 1,
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
      eligibleCourses: [
        cid("ART", "1014"), cid("ART", "1044"),
        cid("MUS", "1014"), cid("MUS", "1054"),
        cid("TA", "1014"), cid("TA", "1044"),
        cid("ARCH", "1016"), cid("CINE", "2054"), cid("CINE", "2064"),
        cid("CREA", "2184"),
      ],
      satisfiedBy: satisfied([
        cid("ART", "1014"), cid("ART", "1044"),
        cid("MUS", "1014"), cid("MUS", "1054"),
        cid("TA", "1014"), cid("TA", "1044"),
        cid("ARCH", "1016"), cid("CINE", "2054"), cid("CINE", "2064"),
        cid("CREA", "2184"),
      ]),
      remaining: satisfied([
        cid("ART", "1014"), cid("ART", "1044"),
        cid("MUS", "1014"), cid("MUS", "1054"),
        cid("TA", "1014"), cid("TA", "1044"),
        cid("ARCH", "1016"), cid("CINE", "2054"), cid("CINE", "2064"),
        cid("CREA", "2184"),
      ]).length >= 1 ? 0 : 1,
    },
    {
      id: "pathways-7",
      name: "Pathways 7 — Critical Analysis of Identity and Equity",
      category: "pathways",
      requiredCredits: 3,
      coursesNeeded: 1,
      eligibleCourses: [
        cid("FL", "2104"), cid("SPAN", "2104"),
        cid("GEO", "2404"), cid("SOC", "1004"),
        cid("AFST", "1024"), cid("WGS", "1024"),
        cid("RLCL", "1014"), cid("AINS", "1024"),
        cid("ALCE", "1004"), cid("APSC", "1024"),
      ],
      satisfiedBy: satisfied([
        cid("FL", "2104"), cid("SPAN", "2104"),
        cid("GEO", "2404"), cid("SOC", "1004"),
        cid("AFST", "1024"), cid("WGS", "1024"),
        cid("RLCL", "1014"), cid("AINS", "1024"),
        cid("ALCE", "1004"), cid("APSC", "1024"),
      ]),
      remaining: satisfied([
        cid("FL", "2104"), cid("SPAN", "2104"),
        cid("GEO", "2404"), cid("SOC", "1004"),
        cid("AFST", "1024"), cid("WGS", "1024"),
        cid("RLCL", "1014"), cid("AINS", "1024"),
        cid("ALCE", "1004"), cid("APSC", "1024"),
      ]).length >= 1 ? 0 : 1,
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
    {
      id: "free-electives",
      name: "Free Electives",
      category: "free_elective",
      requiredCredits: 12,
      coursesNeeded: 4,
      eligibleCourses: freeElectiveEligible,
      satisfiedBy: satisfied(freeElectiveEligible),
      remaining: Math.max(0, 4 - satisfied(freeElectiveEligible).length),
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
