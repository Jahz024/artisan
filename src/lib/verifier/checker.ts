/**
 * Verifier — Deterministic Plan Checker
 * 
 * No LLM involved. Pure code that checks hard constraints.
 */

import type {
  PlanGraph,
  RequirementsPackage,
  UserPreferences,
  VerifierIssue,
  PlanNode,
  SemesterTerm,
} from "@/types/contracts";

export function verify(
  plan: PlanGraph,
  reqPkg: RequirementsPackage,
  prefs: UserPreferences
): VerifierIssue[] {
  const issues: VerifierIssue[] = [];

  issues.push(...checkPrerequisites(plan, reqPkg));
  issues.push(...checkTimeConflicts(plan, reqPkg));
  issues.push(...checkCreditLimits(plan, reqPkg, prefs));
  issues.push(...checkTermAvailability(plan, reqPkg));
  issues.push(...checkRequirementCoverage(plan, reqPkg));

  return issues;
}

function checkPrerequisites(plan: PlanGraph, reqPkg: RequirementsPackage): VerifierIssue[] {
  const issues: VerifierIssue[] = [];
  const nodeMap = new Map(plan.nodes.map((n) => [n.id, n]));
  const courseNodeMap = new Map(plan.nodes.map((n) => [n.courseId, n]));

  for (const node of plan.nodes) {
    if (node.status === "completed") continue;

    const prereqs = reqPkg.prerequisiteGraph[node.courseId] || [];
    for (const prereqId of prereqs) {
      const prereqNode = courseNodeMap.get(prereqId);

      if (!prereqNode) {
        // Prereq might be completed and not in plan
        const isCompleted = reqPkg.completedCourses.some((c) => c.courseId === prereqId);
        if (!isCompleted) {
          issues.push({
            type: "prerequisite_violation",
            severity: "error",
            nodeIds: [node.id],
            message: `${node.courseId} requires ${prereqId}, which is not in the plan or completed.`,
            suggestedFix: `Add ${prereqId} before ${node.courseId}.`,
            responsibleAgent: "agent3",
          });
        }
        continue;
      }

      // Check order
      if (prereqNode.status !== "completed" && prereqNode.status !== "in_progress") {
        if (compareSemesters(prereqNode.semester, node.semester) >= 0) {
          issues.push({
            type: "prerequisite_violation",
            severity: "error",
            nodeIds: [node.id, prereqNode.id],
            message: `${node.courseId} is scheduled in ${node.semester.label} but its prerequisite ${prereqId} is in ${prereqNode.semester.label} (same or later).`,
            suggestedFix: `Move ${node.courseId} to a later semester or ${prereqId} to an earlier one.`,
            responsibleAgent: "agent3",
          });
        }
      }
    }
  }

  return issues;
}

function checkTimeConflicts(plan: PlanGraph, reqPkg: RequirementsPackage): VerifierIssue[] {
  const issues: VerifierIssue[] = [];

  // Only check planned_next (upcoming semester) where we have real section data
  const nextNodes = plan.nodes.filter((n) => n.status === "planned_next" && n.sectionCrn);
  
  for (let i = 0; i < nextNodes.length; i++) {
    for (let j = i + 1; j < nextNodes.length; j++) {
      const sectionA = reqPkg.currentTermSections.find((s) => s.crn === nextNodes[i].sectionCrn);
      const sectionB = reqPkg.currentTermSections.find((s) => s.crn === nextNodes[j].sectionCrn);

      if (!sectionA || !sectionB) continue;

      if (hasTimeConflict(sectionA, sectionB)) {
        issues.push({
          type: "time_conflict",
          severity: "error",
          nodeIds: [nextNodes[i].id, nextNodes[j].id],
          message: `Time conflict: ${nextNodes[i].courseId} (${sectionA.days} ${sectionA.startTime}–${sectionA.endTime}) overlaps with ${nextNodes[j].courseId} (${sectionB.days} ${sectionB.startTime}–${sectionB.endTime}).`,
          suggestedFix: `Choose a different section for one of these courses.`,
          responsibleAgent: "agent3",
        });
      }
    }
  }

  return issues;
}

function checkCreditLimits(
  plan: PlanGraph,
  reqPkg: RequirementsPackage,
  prefs: UserPreferences
): VerifierIssue[] {
  const issues: VerifierIssue[] = [];

  for (const sem of plan.semesters) {
    const plannedNodes = sem.nodeIds
      .map((id) => plan.nodes.find((n) => n.id === id))
      .filter((n): n is PlanNode => !!n && (n.status === "planned_next" || n.status === "planned_future"));

    if (plannedNodes.length === 0) continue;

    if (sem.totalCredits > prefs.creditLoadMax) {
      issues.push({
        type: "credit_overload",
        severity: "error",
        nodeIds: plannedNodes.map((n) => n.id),
        message: `${sem.term.label} has ${sem.totalCredits} credits, exceeding the maximum of ${prefs.creditLoadMax}.`,
        suggestedFix: `Move a course from ${sem.term.label} to another semester.`,
        responsibleAgent: "agent3",
      });
    }

    if (sem.totalCredits < prefs.creditLoadMin) {
      issues.push({
        type: "credit_underload",
        severity: "warning",
        nodeIds: [],
        message: `${sem.term.label} has only ${sem.totalCredits} credits, below the minimum of ${prefs.creditLoadMin}.`,
        suggestedFix: `Add another course to ${sem.term.label} or adjust credit load preferences.`,
        responsibleAgent: "agent3",
      });
    }
  }

  return issues;
}

function checkTermAvailability(plan: PlanGraph, reqPkg: RequirementsPackage): VerifierIssue[] {
  const issues: VerifierIssue[] = [];

  for (const node of plan.nodes) {
    if (node.status === "completed" || node.status === "in_progress") continue;

    const offerings = reqPkg.historicOfferings[node.courseId];
    if (!offerings) continue;

    const termOff = offerings.find((o) => o.termType === node.semester.termType);
    if (termOff) {
      if (termOff.classification === "never") {
        issues.push({
          type: "term_unavailable",
          severity: "error",
          nodeIds: [node.id],
          message: `${node.courseId} has never been offered in ${node.semester.termType} (checked ${termOff.yearsChecked} years).`,
          suggestedFix: `Move ${node.courseId} to a ${offerings.find((o) => o.classification !== "never")?.termType || "different"} semester.`,
          responsibleAgent: "agent1",
        });
      } else if (termOff.classification === "rarely") {
        issues.push({
          type: "rare_offering_warning",
          severity: "warning",
          nodeIds: [node.id],
          message: `${node.courseId} is rarely offered in ${node.semester.termType} (${termOff.yearsOffered}/${termOff.yearsChecked} years).`,
          suggestedFix: `Consider moving to a semester where it's more reliably offered.`,
          responsibleAgent: "agent1",
        });
      }
    }
  }

  return issues;
}

function checkRequirementCoverage(plan: PlanGraph, reqPkg: RequirementsPackage): VerifierIssue[] {
  const issues: VerifierIssue[] = [];

  const plannedCourses = new Set(
    plan.nodes
      .filter((n) => n.status !== "completed")
      .map((n) => n.courseId)
  );
  const completedCourses = new Set(reqPkg.completedCourses.map((c) => c.courseId));
  const allCoveredCourses = new Set([...plannedCourses, ...completedCourses]);

  for (const block of reqPkg.requirementBlocks) {
    if (block.remaining <= 0) continue;

    const coveredCount = block.eligibleCourses.filter((c) => allCoveredCourses.has(c)).length;
    const needed = block.satisfiedBy.length + block.remaining;

    if (coveredCount < needed) {
      issues.push({
        type: "requirement_unsatisfied",
        severity: "error",
        nodeIds: [],
        message: `Requirement "${block.name}" needs ${block.remaining} more course(s) but only ${Math.max(0, coveredCount - block.satisfiedBy.length)} planned.`,
        suggestedFix: `Add a course from: ${block.eligibleCourses.filter((c) => !allCoveredCourses.has(c)).slice(0, 3).join(", ")}.`,
        responsibleAgent: "agent3",
      });
    }
  }

  return issues;
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function compareSemesters(a: SemesterTerm, b: SemesterTerm): number {
  if (a.year !== b.year) return a.year - b.year;
  const order = { spring: 0, summer: 1, fall: 2 };
  return order[a.termType] - order[b.termType];
}

function hasTimeConflict(
  a: { days: string; startTime: string; endTime: string },
  b: { days: string; startTime: string; endTime: string }
): boolean {
  const daysA = a.days.split("");
  const daysB = b.days.split("");
  const sharedDays = daysA.filter((d) => daysB.includes(d));
  if (sharedDays.length === 0) return false;

  const startA = timeToMinutes(a.startTime);
  const endA = timeToMinutes(a.endTime);
  const startB = timeToMinutes(b.startTime);
  const endB = timeToMinutes(b.endTime);

  return startA < endB && startB < endA;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
