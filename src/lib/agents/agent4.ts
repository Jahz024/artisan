/**
 * Agent 4 — Presentation Strategist
 * 
 * Decides how to present the plan visually: emphasis, annotations, art direction.
 */

import type {
  PlanGraph,
  RequirementsPackage,
  ExperiencePackage,
  UserPreferences,
  PresentationSpec,
  ArtDirection,
  EmphasisItem,
  NodeAnnotation,
  SemesterAnnotation,
} from "@/types/contracts";

type ProgressCallback = (message: string, progress: number) => void;

export async function runAgent4(
  planGraph: PlanGraph,
  reqPkg: RequirementsPackage,
  _expPkg: ExperiencePackage,
  _prefs: UserPreferences,
  onProgress: ProgressCallback
): Promise<PresentationSpec> {
  onProgress("Analyzing plan structure for visual emphasis…", 15);
  await delay(500);

  // Find emphasis items
  const emphasisItems: EmphasisItem[] = [];

  // Find longest prerequisite chain
  const chainLengths = findLongestChains(planGraph);
  const longestChain = chainLengths.sort((a, b) => b.length - a.length)[0];
  if (longestChain && longestChain.length >= 3) {
    emphasisItems.push({
      type: "long_chain",
      nodeIds: longestChain,
      title: "Critical Prerequisite Chain",
      description: `This ${longestChain.length}-course chain determines your earliest graduation date.`,
      priority: 1,
    });
  }

  onProgress("Identifying bottlenecks and risky placements…", 35);
  await delay(400);

  // Find heavy semesters
  for (const sem of planGraph.semesters) {
    if (sem.totalCredits >= 18) {
      emphasisItems.push({
        type: "heavy_semester",
        nodeIds: sem.nodeIds,
        title: `Heavy Load: ${sem.term.label}`,
        description: `${sem.totalCredits} credits — consider lightening this semester.`,
        priority: 2,
      });
    }
  }

  // Find rarely-offered courses
  for (const node of planGraph.nodes) {
    if (node.status === "planned_future") {
      const offerings = reqPkg.historicOfferings[node.courseId];
      if (offerings) {
        const termOff = offerings.find((o) => o.termType === node.semester.termType);
        if (termOff && termOff.classification === "rarely") {
          emphasisItems.push({
            type: "rare_offering",
            nodeIds: [node.id],
            title: `Risky Placement`,
            description: `${node.courseId} is rarely offered in ${node.semester.termType}. Have a backup plan.`,
            priority: 2,
          });
        }
      }
    }
  }

  onProgress("Writing annotations for key courses…", 55);
  await delay(600);

  // Node annotations
  const nodeAnnotations: NodeAnnotation[] = [];
  for (const node of planGraph.nodes) {
    if (node.warnings.length > 0) {
      nodeAnnotations.push({
        nodeId: node.id,
        text: node.warnings[0],
        tone: "warning",
      });
    }
  }

  // Add tips for high-score courses
  const topScored = [...planGraph.nodes]
    .filter((n) => n.status === "planned_next")
    .sort((a, b) => b.score - a.score);
  if (topScored[0]) {
    const course = reqPkg.courseDetails[topScored[0].courseId];
    nodeAnnotations.push({
      nodeId: topScored[0].id,
      text: `Top pick for next semester — ${course?.title || topScored[0].courseId} scored highest for your preferences.`,
      tone: "celebration",
    });
  }

  onProgress("Selecting art direction…", 75);
  await delay(400);

  // Choose art direction based on major
  const artDirection: ArtDirection = chooseArtDirection(reqPkg.major);

  // Semester annotations
  const semesterAnnotations: SemesterAnnotation[] = [];
  const nextSem = planGraph.semesters.find((s) =>
    s.nodeIds.some((nid) => planGraph.nodes.find((n) => n.id === nid)?.status === "planned_next")
  );
  if (nextSem) {
    semesterAnnotations.push({
      term: nextSem.term,
      text: `Your upcoming semester: ${nextSem.totalCredits} credits, ${nextSem.nodeIds.length} courses.`,
      tone: "info",
    });
  }

  const lastSem = planGraph.semesters[planGraph.semesters.length - 1];
  if (lastSem) {
    semesterAnnotations.push({
      term: lastSem.term,
      text: "🎓 Graduation semester!",
      tone: "celebration",
    });
  }

  onProgress("Composing hero message…", 90);
  await delay(300);

  const plannedSemesters = planGraph.semesters.filter((s) =>
    s.nodeIds.some((nid) => {
      const n = planGraph.nodes.find((node) => node.id === nid);
      return n && (n.status === "planned_next" || n.status === "planned_future");
    })
  );

  const defaultHero = `${plannedSemesters.length} semester${plannedSemesters.length !== 1 ? "s" : ""} to your ${reqPkg.major} degree — let's make ${plannedSemesters.length !== 1 ? "them" : "it"} count.`;

  // ─── LLM: Generate personalized hero message and plan summary ─────────
  onProgress("Using AI to generate personalized plan summary…", 92);

  const { chatText } = await import("@/lib/llm");
  const heroMessage = await chatText(
    `You are a motivational academic advisor for Virginia Tech. Write a brief, encouraging one-liner (max 15 words) about a student's academic plan. Be specific to their situation. No emojis.`,
    `Student: ${reqPkg.major} major. They have ${plannedSemesters.length} semesters left until graduation in ${planGraph.estimatedGraduation.label}. They've completed ${reqPkg.completedCourses.length} courses and have ${planGraph.nodes.filter((n) => n.status === "planned_next" || n.status === "planned_future").length} courses remaining.`,
    defaultHero
  );

  onProgress("Presentation strategy complete.", 100);

  return {
    suggestedArtDirection: artDirection,
    artDirectionReason: getArtDirectionReason(artDirection),
    emphasisItems,
    nodeAnnotations,
    semesterAnnotations,
    heroMessage,
    colorAccent: getColorAccent(artDirection),
  };
}

function chooseArtDirection(major: string): ArtDirection {
  const m = major.toLowerCase();
  if (m.includes("computer") || m.includes("cs") || m.includes("engineering"))
    return "circuit_board";
  if (m.includes("art") || m.includes("design")) return "watercolor_garden";
  if (m.includes("architecture") || m.includes("building")) return "blueprint";
  return "constellation";
}

function getArtDirectionReason(dir: ArtDirection): string {
  const reasons: Record<ArtDirection, string> = {
    constellation: "A cosmic map where each course is a star, and prerequisite chains form constellations guiding you toward graduation.",
    subway_map: "A transit-style map where each line is a requirement track, and stations are courses along your route.",
    mountain_trail: "A hiking trail through academic peaks, with each semester as a new elevation gain.",
    circuit_board: "A digital circuit where data flows through prerequisite paths — fitting for a CS major.",
    watercolor_garden: "A blooming garden where each course is a flower growing in its season.",
    blueprint: "An architectural blueprint where your degree is the building under construction.",
  };
  return reasons[dir];
}

function getColorAccent(dir: ArtDirection): string {
  const colors: Record<ArtDirection, string> = {
    constellation: "#7C3AED",
    subway_map: "#DC2626",
    mountain_trail: "#059669",
    circuit_board: "#06B6D4",
    watercolor_garden: "#EC4899",
    blueprint: "#2563EB",
  };
  return colors[dir];
}

function findLongestChains(planGraph: PlanGraph): string[][] {
  const adjList: Map<string, string[]> = new Map();
  for (const edge of planGraph.edges) {
    if (!adjList.has(edge.from)) adjList.set(edge.from, []);
    adjList.get(edge.from)!.push(edge.to);
  }

  const chains: string[][] = [];
  const roots = planGraph.nodes
    .filter((n) => !planGraph.edges.some((e) => e.to === n.id))
    .map((n) => n.id);

  function dfs(nodeId: string, path: string[]) {
    const neighbors = adjList.get(nodeId) || [];
    if (neighbors.length === 0) {
      chains.push([...path]);
      return;
    }
    for (const next of neighbors) {
      path.push(next);
      dfs(next, path);
      path.pop();
    }
  }

  for (const root of roots) {
    dfs(root, [root]);
  }

  return chains;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
