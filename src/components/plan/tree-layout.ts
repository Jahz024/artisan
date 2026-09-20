import type { PlanEdge, PlanGraph, PlanNode, SemesterTerm } from "@/types/contracts";
import { termKey } from "@/lib/utils";

const TERM_ORDER: Record<string, number> = { fall: 0, spring: 1, summer: 2 };

export const TREE_LAYOUT = {
  startX: 120,
  columnGap: 280,
  rowGap: 90,
  topPadding: 100,
  labelOffset: 48,
  electiveGap: 120,
  nodeRadius: 14,
  minWidth: 900,
  minHeight: 550,
  sidePadding: 80,
} as const;

export function termSortKey(term: SemesterTerm): number {
  return term.year * 3 + (TERM_ORDER[term.termType] ?? 0);
}

export function compareSemesters(a: SemesterTerm, b: SemesterTerm): number {
  const keyA = a.year * 3 + (TERM_ORDER[a.termType] ?? 0);
  const keyB = b.year * 3 + (TERM_ORDER[b.termType] ?? 0);
  return keyA - keyB;
}

export interface TreeNodePosition {
  id: string;
  x: number;
  y: number;
  columnIndex: number;
  isElective: boolean;
}

export interface SemesterColumnLayout {
  term: SemesterTerm;
  x: number;
  labelY: number;
  columnIndex: number;
}

export interface TreeLayoutResult {
  positions: Map<string, TreeNodePosition>;
  semesterColumns: SemesterColumnLayout[];
  width: number;
  height: number;
}

export function getPrereqConnectedIds(edges: PlanEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const e of edges) {
    if (e.type !== "prerequisite") continue;
    ids.add(e.from);
    ids.add(e.to);
  }
  return ids;
}

function columnX(columnIndex: number): number {
  return TREE_LAYOUT.startX + columnIndex * TREE_LAYOUT.columnGap;
}

function assignColumnYs(
  nodeIds: string[],
  preferredY: Map<string, number>,
  startY: number,
  allPositions: Map<string, TreeNodePosition>,
  parentsOf: Map<string, string[]>
): Map<string, number> {
  // Sort by preferred Y, but also group nodes that share a parent together
  // to reduce crossings
  const sorted = [...nodeIds].sort((a, b) => {
    const ya = preferredY.get(a) ?? Infinity;
    const yb = preferredY.get(b) ?? Infinity;
    if (ya !== yb) return ya - yb;
    return a.localeCompare(b);
  });

  const result = new Map<string, number>();
  let y = startY;
  for (const id of sorted) {
    const pref = preferredY.get(id);
    if (pref !== undefined && pref > y) {
      y = pref;
    }
    result.set(id, y);
    y += TREE_LAYOUT.rowGap;
  }
  return result;
}

function deCollideColumnYs(
  ys: Map<string, number>,
  nodeIds: string[],
  minGap: number
): Map<string, number> {
  if (nodeIds.length === 0) return ys;

  const sorted = [...nodeIds].sort((a, b) => {
    const ya = ys.get(a) ?? 0;
    const yb = ys.get(b) ?? 0;
    if (ya !== yb) return ya - yb;
    return a.localeCompare(b);
  });

  const result = new Map(ys);
  for (let i = 1; i < sorted.length; i++) {
    const prevId = sorted[i - 1]!;
    const currId = sorted[i]!;
    const prevY = result.get(prevId) ?? 0;
    let currY = result.get(currId) ?? 0;
    if (currY - prevY < minGap) {
      currY = prevY + minGap;
      result.set(currId, currY);
    }
  }
  return result;
}

export function computeTreeLayout(graph: PlanGraph): TreeLayoutResult {
  const sortedSemesters = [...graph.semesters].sort(
    (a, b) => termSortKey(a.term) - termSortKey(b.term)
  );

  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const connected = getPrereqConnectedIds(graph.edges);

  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.type !== "prerequisite") continue;
    const pList = parentsOf.get(e.to) ?? [];
    pList.push(e.from);
    parentsOf.set(e.to, pList);
    const cList = childrenOf.get(e.from) ?? [];
    cList.push(e.to);
    childrenOf.set(e.from, cList);
  }

  const positions = new Map<string, TreeNodePosition>();
  const columnNodeIds = sortedSemesters.map((sg) =>
    sg.nodeIds.filter((id) => {
      const n = nodeMap.get(id);
      if (!n) return false;
      return connected.has(id);
    })
  );

  const electiveByColumn = sortedSemesters.map((sg) =>
    sg.nodeIds.filter((id) => connected.has(id) === false && nodeMap.has(id))
  );

  // ------- Crossing-reduction via barycenter heuristic -------
  // Build a mutable ordering per column that we refine over several sweeps.
  const columnOrders: string[][] = columnNodeIds.map((ids) => [...ids]);

  // Helper: given current Y assignments, compute average Y of connected nodes in
  // an adjacent column. Returns Infinity when there are no connections so the
  // node sinks to the bottom rather than jumping to the top.
  function barycenterY(
    nodeId: string,
    neighbours: Map<string, string[]>,
    yOf: Map<string, number>
  ): number {
    const nbs = (neighbours.get(nodeId) ?? []).filter((n) => yOf.has(n));
    if (nbs.length === 0) return Infinity;
    return nbs.reduce((s, n) => s + (yOf.get(n) ?? 0), 0) / nbs.length;
  }

  // Initial placement: evenly spaced
  const yAssign = new Map<string, number>();
  for (let ci = 0; ci < columnOrders.length; ci++) {
    columnOrders[ci].forEach((id, i) => {
      yAssign.set(id, TREE_LAYOUT.topPadding + i * TREE_LAYOUT.rowGap);
    });
  }

  // Sweep 4 times (forward then backward) — enough for most DAGs
  for (let sweep = 0; sweep < 4; sweep++) {
    // Forward pass (left → right): order by average parent Y
    for (let ci = 1; ci < columnOrders.length; ci++) {
      const ids = columnOrders[ci];
      ids.sort((a, b) => {
        const ba = barycenterY(a, parentsOf, yAssign);
        const bb = barycenterY(b, parentsOf, yAssign);
        if (ba !== bb) return ba - bb;
        return (yAssign.get(a) ?? 0) - (yAssign.get(b) ?? 0);
      });
      // Re-assign Ys after sorting
      ids.forEach((id, i) => {
        yAssign.set(id, TREE_LAYOUT.topPadding + i * TREE_LAYOUT.rowGap);
      });
    }

    // Backward pass (right → left): order by average child Y
    for (let ci = columnOrders.length - 2; ci >= 0; ci--) {
      const ids = columnOrders[ci];
      ids.sort((a, b) => {
        const ba = barycenterY(a, childrenOf, yAssign);
        const bb = barycenterY(b, childrenOf, yAssign);
        if (ba !== bb) return ba - bb;
        return (yAssign.get(a) ?? 0) - (yAssign.get(b) ?? 0);
      });
      ids.forEach((id, i) => {
        yAssign.set(id, TREE_LAYOUT.topPadding + i * TREE_LAYOUT.rowGap);
      });
    }
  }

  // Final placement: use the refined order but pull nodes toward their
  // parents' average Y for a natural organic feel, then de-collide.
  let treeBottom: number = TREE_LAYOUT.topPadding;

  sortedSemesters.forEach((_sg, columnIndex) => {
    const ids = columnOrders[columnIndex];
    if (ids.length === 0) return;

    const preferred = new Map<string, number>();
    for (const id of ids) {
      const parents = (parentsOf.get(id) ?? []).filter((p) => positions.has(p));
      if (parents.length > 0) {
        const avg =
          parents.reduce((sum, p) => sum + (positions.get(p)?.y ?? 0), 0) / parents.length;
        preferred.set(id, avg);
      } else {
        // Use the order determined by barycenter sweeps
        preferred.set(id, yAssign.get(id) ?? TREE_LAYOUT.topPadding);
      }
    }

    const ys = deCollideColumnYs(
      assignColumnYs(ids, preferred, TREE_LAYOUT.topPadding, positions, parentsOf),
      ids,
      TREE_LAYOUT.rowGap
    );
    const x = columnX(columnIndex);
    for (const id of ids) {
      const y = ys.get(id) ?? TREE_LAYOUT.topPadding;
      positions.set(id, { id, x, y, columnIndex, isElective: false });
      treeBottom = Math.max(treeBottom, y);
    }
  });

  const electiveStartY = treeBottom + TREE_LAYOUT.electiveGap;

  sortedSemesters.forEach((_sg, columnIndex) => {
    const electives = electiveByColumn[columnIndex] ?? [];
    if (electives.length === 0) return;
    const x = columnX(columnIndex);
    electives.forEach((id, i) => {
      const y = electiveStartY + i * TREE_LAYOUT.rowGap;
      positions.set(id, { id, x, y, columnIndex, isElective: true });
    });
  });

  const semesterColumns: SemesterColumnLayout[] = sortedSemesters.map((sg, columnIndex) => {
    const columnNodes = sg.nodeIds
      .map((id) => positions.get(id))
      .filter((p): p is TreeNodePosition => Boolean(p));
    const minY =
      columnNodes.length > 0
        ? Math.min(...columnNodes.map((p) => p.y))
        : TREE_LAYOUT.topPadding;
    return {
      term: sg.term,
      x: columnX(columnIndex),
      labelY: minY - TREE_LAYOUT.labelOffset,
      columnIndex,
    };
  });

  let maxY: number = TREE_LAYOUT.topPadding;
  let maxX: number = TREE_LAYOUT.startX;
  positions.forEach((p) => {
    maxY = Math.max(maxY, p.y);
    maxX = Math.max(maxX, p.x);
  });

  const width = Math.max(
    TREE_LAYOUT.minWidth,
    maxX + TREE_LAYOUT.sidePadding + TREE_LAYOUT.columnGap / 2
  );
  const height = Math.max(
    TREE_LAYOUT.minHeight,
    maxY + TREE_LAYOUT.sidePadding + TREE_LAYOUT.rowGap
  );

  return { positions, semesterColumns, width, height };
}

export function getNodePortOut(pos: TreeNodePosition): { x: number; y: number } {
  return { x: pos.x + TREE_LAYOUT.nodeRadius, y: pos.y };
}

export function getNodePortIn(pos: TreeNodePosition): { x: number; y: number } {
  return { x: pos.x - TREE_LAYOUT.nodeRadius, y: pos.y };
}

export function edgeWaveOffset(fromId: string, toId: string): number {
  let hash = 0;
  const s = `${fromId}-${toId}`;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return ((hash % 17) - 8) * 0.75;
}

export function branchColorForStatus(status: PlanNode["status"], highlighted: boolean): string {
  switch (status) {
    case "completed":
      return highlighted ? "#9CA3AF" : "#6B7280";
    case "in_progress":
      return highlighted ? "#34D399" : "#10B981";
    case "planned_next":
    case "planned_future":
      return highlighted ? "#FBBF24" : "#F59E0B";
    default:
      return "#6B7280";
  }
}

export function nodeFillForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "completed":
      return "#6B7280";
    case "in_progress":
      return "#10B981";
    case "planned_next":
      return "#F59E0B";
    case "planned_future":
      return "rgba(245, 158, 11, 0.7)";
    default:
      return "#6B7280";
  }
}

export function nodeStrokeForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "completed":
      return "#4B5563";
    case "in_progress":
      return "#059669";
    case "planned_next":
      return "#D97706";
    case "planned_future":
      return "#B45309";
    default:
      return "#374151";
  }
}

export function formatSemesterLabel(term: SemesterTerm): string {
  return term.label;
}

export { termKey };
