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

/**
 * Transit-line palette. Each prerequisite chain rides its own colored line.
 * These are CSS variables so dark mode can brighten them without a re-render
 * (see the --l0…--l5 blocks in globals.css).
 */
export const LINE_PALETTE = [
  "var(--l0)",
  "var(--l1)",
  "var(--l2)",
  "var(--l3)",
  "var(--l4)",
  "var(--l5)",
] as const;

export interface LineAssignment {
  /** Line index per course. */
  lineOf: Map<string, number>;
  /** Courses that started a new line despite having a placed parent. */
  branched: Set<string>;
  /** Resolved colour per course. */
  colorOf: Map<string, string>;
}

/**
 * Assign every prerequisite-connected course to a "line".
 *
 * Walking courses in semester-then-row order, a course continues the colour of
 * its vertically closest parent — but only if that parent has not already
 * passed its colour on. A parent therefore feeds exactly one child; every
 * other child starts a fresh line and is marked "branched". Without that rule
 * a single root bleeds its colour across the whole map and everything reads
 * maroon.
 */
export function computeLineAssignment(
  graph: PlanGraph,
  positions: Map<string, TreeNodePosition>
): LineAssignment {
  const parentsOf = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.type !== "prerequisite") continue;
    const list = parentsOf.get(e.to) ?? [];
    list.push(e.from);
    parentsOf.set(e.to, list);
  }

  const ordered = [...positions.values()]
    .filter((p) => !p.isElective)
    .sort((a, b) => a.columnIndex - b.columnIndex || a.y - b.y);

  const lineOf = new Map<string, number>();
  const branched = new Set<string>();
  const continued = new Set<string>();
  let nextLine = 0;

  for (const pos of ordered) {
    const placed = (parentsOf.get(pos.id) ?? []).filter((id) => lineOf.has(id));
    const available = placed.filter((id) => !continued.has(id));

    if (available.length === 0) {
      lineOf.set(pos.id, nextLine++);
      // It has parents, but they have all already been continued: this is a
      // branch leaving an existing line rather than a brand new root.
      if (placed.length > 0) branched.add(pos.id);
      continue;
    }

    // Prefer the parent sitting closest vertically: the straightest track.
    const best = available.reduce((a, b) =>
      Math.abs((positions.get(a)?.y ?? 0) - pos.y) <=
      Math.abs((positions.get(b)?.y ?? 0) - pos.y)
        ? a
        : b
    );
    lineOf.set(pos.id, lineOf.get(best)!);
    continued.add(best);
  }

  const colorOf = new Map<string, string>();
  lineOf.forEach((line, id) => colorOf.set(id, LINE_PALETTE[line % LINE_PALETTE.length]));
  return { lineOf, branched, colorOf };
}

/**
 * Colour for one edge. A continuing track keeps its colour; a branch takes the
 * new line's colour as it leaves; a transfer into an existing line keeps the
 * colour it came from.
 */
export function edgeLineColor(
  from: string,
  to: string,
  assignment: LineAssignment
): string {
  const a = assignment.lineOf.get(from) ?? 0;
  const b = assignment.lineOf.get(to);
  const line = b === undefined || a === b ? a : assignment.branched.has(to) ? b : a;
  return LINE_PALETTE[line % LINE_PALETTE.length];
}

/** Back-compat wrapper: colour per course. */
export function computeLineColors(
  graph: PlanGraph,
  positions: Map<string, TreeNodePosition>
): Map<string, string> {
  return computeLineAssignment(graph, positions).colorOf;
}

/**
 * Route an edge the way Beck and Vignelli drew track: horizontal runs joined
 * by a single 45° diagonal, with softened corners.
 */
export function transitPath(
  from: { x: number; y: number },
  to: { x: number; y: number }
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  // Too little horizontal room to fit a run/diagonal/run: draw it straight.
  // Without this the run below goes negative and the corner curves blow up
  // into wide arcs across the map.
  if (dx < 30) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  if (Math.abs(dy) < 1) return `M ${from.x} ${from.y} H ${to.x}`;

  const minRun = 18;
  const diag = Math.min(Math.abs(dy), Math.max(0, dx - minRun * 2));
  const run = (dx - diag) / 2;
  const sign = dy > 0 ? 1 : -1;

  const a = { x: from.x + run, y: from.y };
  // If the drop is steeper than 45°, finish it with a vertical segment.
  const b = { x: a.x + diag, y: from.y + sign * diag };
  const c = { x: b.x, y: to.y };
  const r = Math.min(10, run, diag / 2 || 10);

  const parts = [`M ${from.x} ${from.y}`, `H ${a.x - r}`, `Q ${a.x} ${a.y} ${a.x + r * 0.7} ${a.y + sign * r * 0.7}`];
  if (Math.abs(c.y - b.y) > 1) {
    parts.push(`L ${b.x - r * 0.4} ${b.y - sign * r * 0.4}`, `Q ${b.x} ${b.y} ${b.x} ${b.y + sign * r}`);
    parts.push(`V ${c.y - sign * r}`, `Q ${c.x} ${c.y} ${c.x + r} ${c.y}`);
  } else {
    parts.push(`L ${b.x - r * 0.7} ${b.y - sign * r * 0.7}`, `Q ${b.x} ${b.y} ${b.x + r} ${b.y}`);
  }
  parts.push(`H ${to.x}`);
  return parts.join(" ");
}

export function branchColorForStatus(status: PlanNode["status"], highlighted: boolean): string {
  switch (status) {
    case "completed":
      return highlighted ? "#45404D" : "#8A8590";
    case "in_progress":
      return "#E5751F";
    case "planned_next":
      return "#861F41";
    case "planned_future":
      return highlighted ? "#1D1A24" : "#45404D";
    default:
      return "#8A8590";
  }
}

/** Station fill: passed stops are solid ink, the current stop is orange, upcoming stops are open. */
export function nodeFillForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "completed":
      return "#1D1A24";
    case "in_progress":
      return "#E5751F";
    case "planned_next":
    case "planned_future":
      return "#FFFFFF";
    default:
      return "#FFFFFF";
  }
}

export function nodeStrokeForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "planned_next":
      return "#861F41";
    default:
      return "#1D1A24";
  }
}

export function nodeStrokeWidthForStatus(status: PlanNode["status"]): number {
  switch (status) {
    case "planned_next":
      return 4;
    case "completed":
      return 2;
    default:
      return 3;
  }
}

export function formatSemesterLabel(term: SemesterTerm): string {
  return term.label;
}

export { termKey };
