import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import type { PlanGraph, PlanNode, VerifierIssue } from "@/types/contracts";

export const GRADUATION_CREDITS = 120;

export function getCourseCredits(courseId: string): number {
  return DEMO_COURSE_TITLES[courseId]?.credits ?? 3;
}

export function isElectiveNode(node: PlanNode): boolean {
  return node.requirementBlockId.includes("elective");
}

export function creditsForNode(node: PlanNode): number {
  return getCourseCredits(node.courseId);
}

export interface GraduationCreditBreakdown {
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  totalAccounted: number;
  percent: number;
}

export function computeGraduationBreakdown(
  planGraph: PlanGraph,
  totalRequired: number = GRADUATION_CREDITS
): GraduationCreditBreakdown {
  let completed = 0;
  let inProgress = 0;
  let planned = 0;

  for (const node of planGraph.nodes) {
    const cr = creditsForNode(node);
    if (node.status === "completed") completed += cr;
    else if (node.status === "in_progress") inProgress += cr;
    else if (node.status === "planned_next" || node.status === "planned_future") planned += cr;
  }

  const totalAccounted = completed + inProgress + planned;
  const remaining = Math.max(0, totalRequired - totalAccounted);
  const percent = Math.min(100, Math.round((totalAccounted / totalRequired) * 100));

  return { completed, inProgress, planned, remaining, totalAccounted, percent };
}

export function sumSemesterCredits(nodes: PlanNode[]): number {
  return nodes.reduce((sum, n) => sum + creditsForNode(n), 0);
}

export function computeSemesterTotalCredits(nodeIds: string[], nodes: PlanNode[]): number {
  return nodeIds.reduce((sum, id) => {
    const node = nodes.find((n) => n.id === id);
    return sum + (node ? creditsForNode(node) : 0);
  }, 0);
}

const NODE_LEVEL_VERIFIER_TYPES = new Set<VerifierIssue["type"]>([
  "prerequisite_violation",
  "corequisite_violation",
  "time_conflict",
  "term_unavailable",
  "rare_offering_warning",
]);

/** Verifier messages that should appear on individual course nodes (not semester-wide load warnings). */
export function getNodeLevelVerifierWarnings(
  nodeId: string,
  issues: VerifierIssue[] | undefined
): string[] {
  if (!issues?.length) return [];
  const messages: string[] = [];
  for (const issue of issues) {
    if (!NODE_LEVEL_VERIFIER_TYPES.has(issue.type)) continue;
    if (issue.nodeIds.includes(nodeId)) messages.push(issue.message);
  }
  return messages;
}

export function sortNodesForCreditReduction(nodes: PlanNode[]): PlanNode[] {
  return [...nodes].sort((a, b) => {
    const aElective = isElectiveNode(a) ? 0 : 1;
    const bElective = isElectiveNode(b) ? 0 : 1;
    if (aElective !== bElective) return aElective - bElective;
    return a.score - b.score;
  });
}

export function suggestCreditAdjustments(
  planGraph: PlanGraph,
  semesterIndex: number,
  currentCredits: number,
  targetCredits: number,
  semesterNodes: PlanNode[]
): { nodeIds: string[]; direction: "reduce" | "increase" | "none"; summary: string } {
  const delta = targetCredits - currentCredits;
  if (delta === 0) {
    return { nodeIds: [], direction: "none", summary: "This semester already matches your target load." };
  }

  if (delta < 0) {
    const movable = semesterNodes.filter(
      (n) => n.status === "planned_next" || n.status === "planned_future"
    );
    const sorted = sortNodesForCreditReduction(movable);
    const nodeIds: string[] = [];
    let shed = 0;
    const need = Math.abs(delta);
    for (const node of sorted) {
      if (shed >= need) break;
      nodeIds.push(node.id);
      shed += creditsForNode(node);
    }
    return {
      nodeIds,
      direction: "reduce",
      summary:
        nodeIds.length > 0
          ? `Highlighting courses to move to a later term (~${need} cr to remove).`
          : "No planned courses here can be moved — adjust other semesters or regenerate.",
    };
  }

  const nextGroup = planGraph.semesters[semesterIndex + 1];
  if (!nextGroup) {
    return {
      nodeIds: [],
      direction: "increase",
      summary: "No later semester available to pull courses from.",
    };
  }

  const nextNodes = nextGroup.nodeIds
    .map((id) => planGraph.nodes.find((n) => n.id === id))
    .filter((n): n is PlanNode => Boolean(n))
    .filter((n) => n.status === "planned_next" || n.status === "planned_future");

  const sorted = sortNodesForCreditReduction(nextNodes);
  const nodeIds: string[] = [];
  let gained = 0;
  for (const node of sorted) {
    if (gained >= delta) break;
    nodeIds.push(node.id);
    gained += creditsForNode(node);
  }

  return {
    nodeIds,
    direction: "increase",
    summary:
      nodeIds.length > 0
        ? `Courses you could pull into this term (~${delta} cr needed). Drag to move — nothing auto-changes.`
        : "No movable courses in the next semester.",
  };
}
