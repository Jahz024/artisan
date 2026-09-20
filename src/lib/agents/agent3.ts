/**
 * Agent 3 — Plan Architect
 * 
 * Builds semester-by-semester plan satisfying all constraints.
 * Uses greedy scheduling as a baseline, then asks the LLM to review and optimize
 * the plan for balance, difficulty distribution, and graduation timing.
 */

import type {
  RequirementsPackage,
  ExperiencePackage,
  UserPreferences,
  PlanGraph,
  PlanNode,
  PlanEdge,
  SemesterGroup,
  SemesterTerm,
  VerifierIssue,
  CourseInfo,
  ConfidenceLevel,
} from "@/types/contracts";
import { v4 as uuid } from "uuid";
import { chatJSON } from "@/lib/llm";

const GRADUATION_CREDITS = 120;

type ProgressCallback = (message: string, progress: number) => void;

type SemAssignment = { credits: number; courses: string[] };

function courseCredits(reqPkg: RequirementsPackage, courseId: string): number {
  return reqPkg.courseDetails[courseId]?.credits ?? 3;
}

function semKey(sem: SemesterTerm): string {
  return `${sem.year}-${sem.termType}`;
}

function collectRemainingCourses(reqPkg: RequirementsPackage): string[] {
  const completedIds = new Set(reqPkg.completedCourses.map((c) => c.courseId));
  const inProgressIds = new Set(reqPkg.inProgressCourses);
  const picked = new Set<string>();
  const result: string[] = [];

  for (const block of reqPkg.requirementBlocks) {
    if (block.remaining <= 0) continue;
    let need = block.remaining;
    for (const courseId of block.eligibleCourses) {
      if (need <= 0) break;
      if (completedIds.has(courseId) || inProgressIds.has(courseId)) continue;
      if (picked.has(courseId)) continue;
      picked.add(courseId);
      result.push(courseId);
      need--;
    }
  }

  return result;
}

function getSemData(
  assignedPerSem: Map<string, SemAssignment>,
  sem: SemesterTerm
): SemAssignment {
  const key = semKey(sem);
  return assignedPerSem.get(key) ?? { credits: 0, courses: [] };
}

function canPlaceCourseInTerm(
  courseId: string,
  sem: SemesterTerm,
  reqPkg: RequirementsPackage,
  prefs: UserPreferences,
  assignedPerSem: Map<string, SemAssignment>,
  courseToSemester: Map<string, SemesterTerm>
): boolean {
  const course = reqPkg.courseDetails[courseId];
  if (!course) return false;

  const semData = getSemData(assignedPerSem, sem);
  if (semData.credits + course.credits > prefs.creditLoadMax) return false;

  const offerings = reqPkg.historicOfferings[courseId];
  if (offerings) {
    const termOffering = offerings.find((o) => o.termType === sem.termType);
    if (termOffering && termOffering.classification === "never") return false;
  }

  return checkPrereqsMet(courseId, reqPkg.prerequisiteGraph, courseToSemester, sem);
}

function placeCourseInTerm(
  courseId: string,
  sem: SemesterTerm,
  reqPkg: RequirementsPackage,
  assignedPerSem: Map<string, SemAssignment>,
  courseToSemester: Map<string, SemesterTerm>
): void {
  const key = semKey(sem);
  const semData = getSemData(assignedPerSem, sem);
  semData.credits += courseCredits(reqPkg, courseId);
  semData.courses.push(courseId);
  assignedPerSem.set(key, semData);
  courseToSemester.set(courseId, sem);
}

function findPlacementForCourse(
  courseId: string,
  semesters: SemesterTerm[],
  reqPkg: RequirementsPackage,
  prefs: UserPreferences,
  assignedPerSem: Map<string, SemAssignment>,
  courseToSemester: Map<string, SemesterTerm>,
  startIdx = 0
): SemesterTerm | null {
  for (let s = startIdx; s < semesters.length; s++) {
    if (canPlaceCourseInTerm(courseId, semesters[s], reqPkg, prefs, assignedPerSem, courseToSemester)) {
      return semesters[s];
    }
  }
  return null;
}

function appendSemester(
  semesters: SemesterTerm[],
  prefs: UserPreferences
): SemesterTerm {
  const last = semesters[semesters.length - 1];
  const extra = generateTermSequence(last, 2, prefs.allowSummer);
  const next = extra[1];
  semesters.push(next);
  return next;
}

function scheduleCourse(
  courseId: string,
  semesters: SemesterTerm[],
  reqPkg: RequirementsPackage,
  prefs: UserPreferences,
  assignedPerSem: Map<string, SemAssignment>,
  courseToSemester: Map<string, SemesterTerm>,
  startIdx = 0
): { placed: boolean; warning?: string } {
  let sem = findPlacementForCourse(
    courseId,
    semesters,
    reqPkg,
    prefs,
    assignedPerSem,
    courseToSemester,
    startIdx
  );

  let extensions = 0;
  while (!sem && extensions < 12) {
    appendSemester(semesters, prefs);
    sem = findPlacementForCourse(
      courseId,
      semesters,
      reqPkg,
      prefs,
      assignedPerSem,
      courseToSemester,
      semesters.length - 1
    );
    extensions++;
  }

  if (!sem) {
    return {
      placed: false,
      warning: `${courseId} could not be scheduled without exceeding ${prefs.creditLoadMax} credits per term — review manually.`,
    };
  }

  placeCourseInTerm(courseId, sem, reqPkg, assignedPerSem, courseToSemester);
  return { placed: true };
}

function pickFreeElectiveCandidates(
  reqPkg: RequirementsPackage,
  scheduledIds: Set<string>
): string[] {
  const completedIds = new Set(reqPkg.completedCourses.map((c) => c.courseId));
  const inProgressIds = new Set(reqPkg.inProgressCourses);

  return Object.keys(reqPkg.courseDetails)
    .filter((id) => !scheduledIds.has(id))
    .filter((id) => !completedIds.has(id) && !inProgressIds.has(id))
    .sort((a, b) => {
      const pa = (reqPkg.prerequisiteGraph[a] ?? []).length;
      const pb = (reqPkg.prerequisiteGraph[b] ?? []).length;
      return pa - pb;
    });
}

function totalAccountedCredits(
  reqPkg: RequirementsPackage,
  scheduledCourseIds: Set<string>
): number {
  let sum = 0;
  for (const cc of reqPkg.completedCourses) {
    sum += cc.credits;
  }
  for (const ip of reqPkg.inProgressCourses) {
    sum += courseCredits(reqPkg, ip);
  }
  for (const id of scheduledCourseIds) {
    if (reqPkg.completedCourses.some((c) => c.courseId === id)) continue;
    if (reqPkg.inProgressCourses.includes(id)) continue;
    sum += courseCredits(reqPkg, id);
  }
  return sum;
}

function fillElectivesToGraduation(
  remainingCourses: string[],
  placementWarnings: Map<string, string>,
  semesters: SemesterTerm[],
  reqPkg: RequirementsPackage,
  prefs: UserPreferences,
  assignedPerSem: Map<string, SemAssignment>,
  courseToSemester: Map<string, SemesterTerm>,
  firstPlannableSemIdx = 1
): void {
  const scheduled = new Set([
    ...reqPkg.completedCourses.map((c) => c.courseId),
    ...reqPkg.inProgressCourses,
    ...remainingCourses,
  ]);

  let accounted = totalAccountedCredits(reqPkg, scheduled);
  const candidates = pickFreeElectiveCandidates(reqPkg, scheduled);

  for (const courseId of candidates) {
    if (accounted >= GRADUATION_CREDITS) break;
    const result = scheduleCourse(
      courseId,
      semesters,
      reqPkg,
      prefs,
      assignedPerSem,
      courseToSemester,
      firstPlannableSemIdx
    );
    if (!result.placed) continue;
    if (result.warning) placementWarnings.set(courseId, result.warning);
    remainingCourses.push(courseId);
    scheduled.add(courseId);
    accounted += courseCredits(reqPkg, courseId);
  }
}

function rebuildSemesterGroups(
  nodes: PlanNode[],
  reqPkg: RequirementsPackage
): SemesterGroup[] {
  const semGroupMap: Map<string, SemesterGroup> = new Map();
  for (const node of nodes) {
    const key = semKey(node.semester);
    const group = semGroupMap.get(key) || {
      term: node.semester,
      nodeIds: [],
      totalCredits: 0,
      warnings: [],
    };
    group.nodeIds.push(node.id);
    group.totalCredits += courseCredits(reqPkg, node.courseId);
    semGroupMap.set(key, group);
  }

  return Array.from(semGroupMap.values()).sort((a, b) => compareSemesters(a.term, b.term));
}

export async function runAgent3(
  reqPkg: RequirementsPackage,
  expPkg: ExperiencePackage,
  prefs: UserPreferences,
  onProgress: ProgressCallback,
  revisionIssues?: VerifierIssue[]
): Promise<PlanGraph> {
  if (revisionIssues?.length) {
    onProgress(`Revising plan to address ${revisionIssues.length} issue(s)…`, 5);
    await delay(500);
  }

  onProgress("Topologically sorting prerequisite graph…", 10);
  await delay(400);

  // Get remaining courses
  const completedIds = new Set(reqPkg.completedCourses.map((c) => c.courseId));
  const inProgressIds = new Set(reqPkg.inProgressCourses);

  const remainingCourses: string[] = collectRemainingCourses(reqPkg);
  const placementWarnings = new Map<string, string>();

  onProgress(`Planning ${remainingCourses.length} remaining courses…`, 25);
  await delay(600);

  // Topological sort based on prerequisites
  const sorted = topologicalSort(remainingCourses, reqPkg.prerequisiteGraph, completedIds);

  onProgress("Assigning courses to semesters…", 40);
  await delay(500);

  // Build semester plan
  const currentTerm = reqPkg.currentTerm;
  // Generate only enough semesters to reach a 4-year graduation from first enrolled term.
  // For a student starting Fall 2023 with current term Fall 2026, that's Fall 2027 target.
  // Calculate how many semesters we actually need (typically 3-4 from current term).
  const targetGradYear = prefs.targetGraduation?.year ?? (currentTerm.year + 1);
  const targetGradTermType = prefs.targetGraduation?.termType ?? "fall";
  const targetGradTermOrd = targetGradYear * 3 + ({ fall: 0, spring: 1, summer: 2 }[targetGradTermType] ?? 0);
  const currentTermOrd = currentTerm.year * 3 + ({ fall: 0, spring: 1, summer: 2 }[currentTerm.termType] ?? 0);
  const semCount = Math.max(4, Math.min(10, targetGradTermOrd - currentTermOrd + 1));
  const semesters: SemesterTerm[] = generateTermSequence(currentTerm, semCount, prefs.allowSummer);
  const courseToSemester: Map<string, SemesterTerm> = new Map();
  const assignedPerSem: Map<string, SemAssignment> = new Map();

  // Assign completed/in-progress courses — track their credits in assignedPerSem
  for (const cc of reqPkg.completedCourses) {
    courseToSemester.set(cc.courseId, cc.term);
    const key = semKey(cc.term);
    const semData = assignedPerSem.get(key) ?? { credits: 0, courses: [] };
    semData.credits += cc.credits;
    semData.courses.push(cc.courseId);
    assignedPerSem.set(key, semData);
  }
  for (const ip of inProgressIds) {
    courseToSemester.set(ip, currentTerm);
    const key = semKey(currentTerm);
    const semData = assignedPerSem.get(key) ?? { credits: 0, courses: [] };
    semData.credits += courseCredits(reqPkg, ip);
    semData.courses.push(ip);
    assignedPerSem.set(key, semData);
  }

  // Greedy assignment — never exceed creditLoadMax; extend semesters when needed
  // Start from index 1 to skip the current semester (student is already enrolled)
  const firstPlannableSemIdx = 1;
  for (const courseId of sorted) {
    if (!reqPkg.courseDetails[courseId]) continue;
    const result = scheduleCourse(
      courseId,
      semesters,
      reqPkg,
      prefs,
      assignedPerSem,
      courseToSemester,
      firstPlannableSemIdx
    );
    if (result.warning) placementWarnings.set(courseId, result.warning);
  }

  fillElectivesToGraduation(
    remainingCourses,
    placementWarnings,
    semesters,
    reqPkg,
    prefs,
    assignedPerSem,
    courseToSemester,
    firstPlannableSemIdx
  );

  // ─── LLM: Review and optimize the greedy schedule ─────────────────────
  onProgress("Asking AI to review and optimize the schedule…", 50);

  const greedyPlan: Record<string, string[]> = {};
  for (const [courseId, sem] of courseToSemester.entries()) {
    if (completedIds.has(courseId) || inProgressIds.has(courseId)) continue;
    const key = sem.label;
    if (!greedyPlan[key]) greedyPlan[key] = [];
    greedyPlan[key].push(courseId);
  }

  const courseInfoList = remainingCourses.map((id) => {
    const c = reqPkg.courseDetails[id];
    const rigor = expPkg.courseRigorSummaries[id];
    return `${id} (${c?.credits ?? 3}cr, difficulty ${rigor?.averageDifficulty?.toFixed(1) ?? "?"}/5)`;
  }).join(", ");

  const prereqRules = Object.entries(reqPkg.prerequisiteGraph)
    .filter(([cid, deps]) => deps.length > 0 && remainingCourses.includes(cid))
    .map(([cid, deps]) => `${cid} requires: ${deps.join(", ")}`)
    .join("\n");

  const semesterSlots = semesters
    .filter((_, i) => i >= firstPlannableSemIdx)
    .map((s) => s.label)
    .join(", ");

  interface LLMSchedule {
    schedule: Record<string, string[]>;
    reasoning: string;
  }

  const llmSchedule = await chatJSON<LLMSchedule>(
    `You are an expert academic schedule optimizer for Virginia Tech CS students. 
Given a set of courses, prerequisites, and semester slots, produce the OPTIMAL schedule.

RULES:
- Each semester can have at most ${prefs.creditLoadMax} credits
- All prerequisites must be completed in an earlier semester (not the same)
- Target graduation: ${prefs.targetGraduation?.label ?? "as soon as possible"}
- Balance difficulty across semesters — don't stack all hard courses together
- Consider course difficulty ratings when distributing
- Minimize total semesters needed

Return JSON with:
- schedule: object mapping semester label → array of course IDs
- reasoning: one paragraph explaining your scheduling decisions`,
    `Courses to schedule: ${courseInfoList}

Available semesters (in order): ${semesterSlots}

Prerequisites:
${prereqRules || "None"}

AI insights from transcript analysis:
${reqPkg.llmAnalysis?.insights?.join(". ") ?? "None available"}

Professor pairing tips:
${expPkg.llmProfInsights?.difficultyPairings?.join(". ") ?? "None available"}

Current greedy schedule for reference:
${JSON.stringify(greedyPlan, null, 2)}`,
    { schedule: greedyPlan, reasoning: "Using greedy schedule (LLM unavailable)." }
  );

  // Apply the LLM-optimized schedule if it returned valid data
  const llmHasSchedule = Object.keys(llmSchedule.schedule).length > 0;
  if (llmHasSchedule) {
    onProgress("Applying AI-optimized schedule…", 55);

    // Build a semester-label-to-term map
    const labelToTerm = new Map<string, SemesterTerm>();
    for (const sem of semesters) labelToTerm.set(sem.label, sem);

    // Re-assign courses based on LLM schedule
    const llmPlacedCourses = new Set<string>();
    for (const [semLabel, courses] of Object.entries(llmSchedule.schedule)) {
      const sem = labelToTerm.get(semLabel);
      if (!sem) continue;
      for (const courseId of courses) {
        if (!reqPkg.courseDetails[courseId]) continue;
        if (completedIds.has(courseId) || inProgressIds.has(courseId)) continue;
        // Verify prerequisites are met in the LLM schedule
        const prereqs = reqPkg.prerequisiteGraph[courseId] ?? [];
        const prereqsMet = prereqs.every((p) => {
          const pSem = courseToSemester.get(p);
          // Also check the LLM schedule itself
          if (!pSem) return completedIds.has(p) || inProgressIds.has(p);
          return compareSemesters(pSem, sem) < 0;
        });
        if (!prereqsMet) continue;

        // Check credit limit
        const key = semKey(sem);
        const semData = assignedPerSem.get(key) ?? { credits: 0, courses: [] };
        const courseCr = courseCredits(reqPkg, courseId);
        // Only apply if within limits (allow some flex since LLM may have re-distributed)
        if (semData.credits + courseCr <= prefs.creditLoadMax + 1) {
          // Remove from old assignment if exists
          const oldSem = courseToSemester.get(courseId);
          if (oldSem) {
            const oldKey = semKey(oldSem);
            const oldData = assignedPerSem.get(oldKey);
            if (oldData) {
              oldData.credits -= courseCr;
              oldData.courses = oldData.courses.filter((c) => c !== courseId);
            }
          }
          courseToSemester.set(courseId, sem);
          semData.credits += courseCr;
          semData.courses.push(courseId);
          assignedPerSem.set(key, semData);
          llmPlacedCourses.add(courseId);
        }
      }
    }

    onProgress(
      `AI optimized ${llmPlacedCourses.size} course placements. ${llmSchedule.reasoning.slice(0, 80)}…`,
      58
    );
  }

  onProgress("Scoring sections and finding alternatives…", 60);
  await delay(700);

  // Build PlanNodes
  const nodes: PlanNode[] = [];
  const edges: PlanEdge[] = [];
  const nodeIdMap: Map<string, string> = new Map();

  // Completed nodes
  for (const cc of reqPkg.completedCourses) {
    const nodeId = uuid();
    nodeIdMap.set(cc.courseId, nodeId);
    const block = reqPkg.requirementBlocks.find((b) => b.satisfiedBy.includes(cc.courseId));
    nodes.push({
      id: nodeId,
      courseId: cc.courseId,
      status: "completed",
      semester: cc.term,
      score: 1,
      scoreBreakdown: { rating: 1, rigorMatch: 1, timeFit: 1, graduationSpeed: 1 },
      confidence: "high",
      alternatives: [],
      requirementBlockId: block?.id || "unknown",
      warnings: [],
      sources: [],
    });
  }

  // In-progress nodes
  for (const ip of inProgressIds) {
    const nodeId = uuid();
    nodeIdMap.set(ip, nodeId);
    const block = reqPkg.requirementBlocks.find((b) => b.eligibleCourses.includes(ip));
    nodes.push({
      id: nodeId,
      courseId: ip,
      status: "in_progress",
      semester: currentTerm,
      score: 0.8,
      scoreBreakdown: { rating: 0.8, rigorMatch: 0.8, timeFit: 0.8, graduationSpeed: 0.8 },
      confidence: "medium",
      alternatives: [],
      requirementBlockId: block?.id || "unknown",
      warnings: ["Currently in progress — assuming pass."],
      sources: [],
    });
  }

  // Planned nodes (requirements + free electives added to reach 120 credits)
  for (const courseId of remainingCourses) {
    const sem = courseToSemester.get(courseId);
    if (!sem) continue;

    const nodeId = uuid();
    nodeIdMap.set(courseId, nodeId);
    const course = reqPkg.courseDetails[courseId];
    const block = reqPkg.requirementBlocks.find((b) => b.eligibleCourses.includes(courseId));
    const placementWarning = placementWarnings.get(courseId);

    // The next plannable semester is the one right after currentTerm
    const nextSem = semesters[firstPlannableSemIdx];
    const isNextSem = nextSem && sem.year === nextSem.year && sem.termType === nextSem.termType;
    const status = isNextSem ? "planned_next" as const : "planned_future" as const;

    // Find best section for next semester
    let bestSection: { crn: string; instructor: string } | undefined;
    if (isNextSem) {
      const sections = reqPkg.currentTermSections.filter((s) => s.courseId === courseId);
      if (sections.length > 0) {
        const scored = sections.map((s) => ({
          section: s,
          score: scoreSection(s, expPkg, prefs),
        }));
        scored.sort((a, b) => b.score - a.score);
        bestSection = { crn: scored[0].section.crn, instructor: scored[0].section.instructor };
      }
    }

    const score = computeCourseScore(courseId, bestSection?.instructor, expPkg, prefs, sem);
    const confidence: ConfidenceLevel = isNextSem ? "high" : "medium";

    nodes.push({
      id: nodeId,
      courseId,
      status,
      semester: sem,
      sectionCrn: bestSection?.crn,
      instructor: bestSection?.instructor,
      score,
      scoreBreakdown: {
        rating: computeRatingScore(bestSection?.instructor, expPkg),
        rigorMatch: computeRigorScore(courseId, expPkg, prefs),
        timeFit: 0.7,
        graduationSpeed: 0.8,
      },
      confidence,
      alternatives: getAlternatives(courseId, reqPkg, expPkg, prefs),
      requirementBlockId: block?.id || "free-elective",
      warnings: placementWarning ? [placementWarning] : [],
      sources: [],
    });
  }

  onProgress("Constructing prerequisite edges…", 80);
  await delay(300);

  // Build edges
  for (const [courseId, prereqs] of Object.entries(reqPkg.prerequisiteGraph)) {
    const toNodeId = nodeIdMap.get(courseId);
    if (!toNodeId) continue;
    for (const prereqId of prereqs) {
      const fromNodeId = nodeIdMap.get(prereqId);
      if (fromNodeId) {
        edges.push({ from: fromNodeId, to: toNodeId, type: "prerequisite" });
      }
    }
  }

  // Build semester groups from actual course credits
  const semesterGroups = rebuildSemesterGroups(nodes, reqPkg);

  onProgress("Finalizing plan…", 95);
  await delay(300);

  // Find last semester with planned courses
  const plannedSemesters = semesterGroups.filter((s) =>
    s.nodeIds.some((nid) => {
      const node = nodes.find((n) => n.id === nid);
      return node && (node.status === "planned_next" || node.status === "planned_future");
    })
  );
  const lastPlannedSem = plannedSemesters[plannedSemesters.length - 1]?.term || currentTerm;

  const scheduledForGraduation = new Set(nodes.map((n) => n.courseId));
  const graduationRemaining = Math.max(
    0,
    GRADUATION_CREDITS - totalAccountedCredits(reqPkg, scheduledForGraduation)
  );

  const planGraph: PlanGraph = {
    id: uuid(),
    studentId: reqPkg.studentId,
    nodes,
    edges,
    semesters: semesterGroups,
    totalRemainingCredits: graduationRemaining,
    estimatedGraduation: lastPlannedSem,
    generatedAt: new Date().toISOString(),
    verifierPassed: false,
    verifierIssues: [],
  };

  onProgress("Plan construction complete.", 100);
  return planGraph;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function topologicalSort(
  courses: string[],
  prereqGraph: Record<string, string[]>,
  completed: Set<string>
): string[] {
  const courseSet = new Set(courses);
  const inDegree: Map<string, number> = new Map();
  const adjList: Map<string, string[]> = new Map();

  for (const c of courses) {
    inDegree.set(c, 0);
    adjList.set(c, []);
  }

  for (const c of courses) {
    const prereqs = prereqGraph[c] || [];
    for (const p of prereqs) {
      if (courseSet.has(p) && !completed.has(p)) {
        adjList.get(p)!.push(c);
        inDegree.set(c, (inDegree.get(c) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  for (const [c, deg] of inDegree) {
    if (deg === 0) queue.push(c);
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    for (const neighbor of adjList.get(current) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    }
  }

  // Add any remaining (cycles or disconnected)
  for (const c of courses) {
    if (!result.includes(c)) result.push(c);
  }

  return result;
}

function generateTermSequence(start: SemesterTerm, count: number, allowSummer: boolean): SemesterTerm[] {
  const terms: SemesterTerm[] = [];
  let year = start.year;
  let termType = start.termType;

  for (let i = 0; i < count; i++) {
    terms.push({ year, termType, label: `${termType.charAt(0).toUpperCase() + termType.slice(1)} ${year}` });

    if (termType === "fall") {
      year++;
      termType = "spring";
    } else if (termType === "spring") {
      termType = allowSummer ? "summer" : "fall";
    } else {
      termType = "fall";
    }
  }

  return terms;
}

function checkPrereqsMet(
  courseId: string,
  prereqGraph: Record<string, string[]>,
  courseToSemester: Map<string, SemesterTerm>,
  targetSem: SemesterTerm
): boolean {
  const prereqs = prereqGraph[courseId] || [];
  for (const p of prereqs) {
    const pSem = courseToSemester.get(p);
    if (!pSem) return false;
    if (compareSemesters(pSem, targetSem) >= 0) return false;
  }
  return true;
}

function compareSemesters(a: SemesterTerm, b: SemesterTerm): number {
  if (a.year !== b.year) return a.year - b.year;
  const order = { spring: 0, summer: 1, fall: 2 };
  return order[a.termType] - order[b.termType];
}

function scoreSection(
  section: { instructor: string; startTime: string; days: string },
  expPkg: ExperiencePackage,
  prefs: UserPreferences
): number {
  let score = 0.5;
  const rating = expPkg.instructorRatings[section.instructor];
  if (rating && rating.numRatings > 0) {
    score += (rating.overallRating / 5) * 0.3;
  }
  if (prefs.timePreferences.noClassesBefore && section.startTime >= prefs.timePreferences.noClassesBefore) {
    score += 0.1;
  }
  if (prefs.timePreferences.noFridayClasses && !section.days.includes("F")) {
    score += 0.1;
  }
  return Math.min(1, score);
}

function computeCourseScore(
  courseId: string,
  instructor: string | undefined,
  expPkg: ExperiencePackage,
  prefs: UserPreferences,
  _sem: SemesterTerm
): number {
  const w = prefs.priorityWeights;
  const totalWeight = w.professorRating + w.rigorPreference + w.timePreferenceFit + w.graduatingSooner;
  if (totalWeight === 0) return 0.5;

  const ratingScore = computeRatingScore(instructor, expPkg);
  const rigorScore = computeRigorScore(courseId, expPkg, prefs);
  const timeScore = 0.7;
  const speedScore = 0.8;

  return (
    (w.professorRating * ratingScore +
      w.rigorPreference * rigorScore +
      w.timePreferenceFit * timeScore +
      w.graduatingSooner * speedScore) /
    totalWeight
  );
}

function computeRatingScore(instructor: string | undefined, expPkg: ExperiencePackage): number {
  if (!instructor) return 0.5;
  const rating = expPkg.instructorRatings[instructor];
  if (!rating || rating.numRatings === 0) return 0.5;
  return rating.overallRating / 5;
}

function computeRigorScore(courseId: string, expPkg: ExperiencePackage, prefs: UserPreferences): number {
  const rigor = expPkg.courseRigorSummaries[courseId];
  if (!rigor) return 0.5;
  const prefNormalized = prefs.priorityWeights.rigorPreference / 10;
  const diffNormalized = rigor.averageDifficulty / 5;
  return 1 - Math.abs(prefNormalized - diffNormalized);
}

function getAlternatives(
  courseId: string,
  reqPkg: RequirementsPackage,
  expPkg: ExperiencePackage,
  prefs: UserPreferences
) {
  const sections = reqPkg.currentTermSections.filter((s) => s.courseId === courseId);
  return sections.slice(0, 3).map((s) => ({
    courseId,
    sectionCrn: s.crn,
    instructor: s.instructor,
    score: scoreSection(s, expPkg, prefs),
    reason: `${s.instructor}, ${s.days} ${s.startTime}–${s.endTime}`,
  }));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
