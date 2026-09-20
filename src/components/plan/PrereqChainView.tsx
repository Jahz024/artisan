"use client";

import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { PlanGraph, PlanNode } from "@/types/contracts";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import { cn, formatCourseCode, termKey } from "@/lib/utils";
import { termSortKey } from "@/components/plan/tree-layout";

export interface PrereqChainViewProps {
  planGraph: PlanGraph;
  className?: string;
}

const NODE_WIDTH = 120;
const NODE_HEIGHT = 50;
const COLUMN_GAP = 160;
const ROW_GAP = 60;
const PADDING_X = 24;
const PADDING_Y = 20;

function isMajorChainBlock(requirementBlockId: string): boolean {
  return (
    requirementBlockId.startsWith("cs-") ||
    requirementBlockId.startsWith("math-") ||
    requirementBlockId.startsWith("statistics") ||
    requirementBlockId.startsWith("science")
  );
}

const LINE_COLORS = [
  "var(--l0)", "var(--l1)", "var(--l2)",
  "var(--l3)", "var(--l4)", "var(--l5)",
];

function fillForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "completed":
      return "var(--paper-sunk)";
    case "in_progress":
      return "var(--line-green)";
    case "planned_next":
    case "planned_future":
      return "var(--orange)";
    default:
      return "var(--paper-sunk)";
  }
}

function strokeForStatus(status: PlanNode["status"]): string {
  switch (status) {
    case "completed":
      return "var(--ink-soft)";
    case "in_progress":
      return "var(--line-green)";
    case "planned_next":
    case "planned_future":
      return "var(--maroon)";
    default:
      return "var(--ink-soft)";
  }
}

interface NodeLayout {
  node: PlanNode;
  x: number;
  y: number;
}

function computeLayout(nodes: PlanNode[]): {
  positions: Map<string, NodeLayout>;
  width: number;
  height: number;
} {
  const byTerm = new Map<string, PlanNode[]>();
  for (const node of nodes) {
    const key = termKey(node.semester);
    const list = byTerm.get(key) ?? [];
    list.push(node);
    byTerm.set(key, list);
  }

  const sortedTerms = [...byTerm.entries()].sort(
    (a, b) => termSortKey(a[1][0]!.semester) - termSortKey(b[1][0]!.semester)
  );

  const positions = new Map<string, NodeLayout>();
  let maxColumnSize = 0;

  sortedTerms.forEach(([, termNodes], columnIndex) => {
    const sorted = [...termNodes].sort((a, b) => a.courseId.localeCompare(b.courseId));
    maxColumnSize = Math.max(maxColumnSize, sorted.length);
    sorted.forEach((node, rowIndex) => {
      positions.set(node.id, {
        node,
        x: PADDING_X + columnIndex * COLUMN_GAP,
        y: PADDING_Y + rowIndex * ROW_GAP,
      });
    });
  });

  const columnCount = Math.max(1, sortedTerms.length);
  const width = PADDING_X * 2 + (columnCount - 1) * COLUMN_GAP + NODE_WIDTH;
  const height =
    PADDING_Y * 2 + Math.max(1, maxColumnSize) * ROW_GAP + NODE_HEIGHT - ROW_GAP;

  return { positions, width, height };
}

export function PrereqChainView({ planGraph, className }: PrereqChainViewProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const { nodes, edges, positions, width, height } = useMemo(() => {
    const nodes = planGraph.nodes.filter((n) => isMajorChainBlock(n.requirementBlockId));
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = planGraph.edges.filter(
      (e) =>
        e.type === "prerequisite" && nodeIds.has(e.from) && nodeIds.has(e.to)
    );
    const layout = computeLayout(nodes);
    return { nodes, edges, ...layout };
  }, [planGraph]);

  const hoveredLayout = hoveredId ? positions.get(hoveredId) : undefined;

  return (
    <section
      className={cn("glass-panel rounded-2xl p-4", className)}
      aria-label="Prerequisite chain for major requirements"
    >
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-[var(--maroon)]" aria-hidden />
        <h3 className="font-display text-sm font-bold text-slate-900">Prerequisite Chain</h3>
      </div>

      {nodes.length === 0 ? (
        <p className="text-sm text-slate-600">No major requirement courses in this plan.</p>
      ) : (
        <div className="relative max-h-[250px] overflow-x-auto overflow-y-auto rounded-xl border border-[var(--ink)]/8 bg-[var(--paper-sunk)]/50">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="min-w-full"
            role="img"
            aria-label="Course prerequisite diagram"
          >
            <defs>
              <marker
                id="prereq-chain-arrow"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="var(--ink-soft)" />
              </marker>
              <filter id="prereq-chain-node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="var(--ink)" floodOpacity="0.12" />
              </filter>
            </defs>

            {edges.map((edge, idx) => {
              const from = positions.get(edge.from);
              const to = positions.get(edge.to);
              if (!from || !to) return null;

              const start = {
                x: from.x + NODE_WIDTH,
                y: from.y + NODE_HEIGHT / 2,
              };
              const end = {
                x: to.x,
                y: to.y + NODE_HEIGHT / 2,
              };
              const dx = end.x - start.x;
              const c1x = start.x + Math.max(32, dx * 0.45);
              const c2x = end.x - Math.max(32, dx * 0.45);
              const d = `M ${start.x} ${start.y} C ${c1x} ${start.y}, ${c2x} ${end.y}, ${end.x} ${end.y}`;

              return (
                <path
                  key={`${edge.from}-${edge.to}`}
                  d={d}
                  fill="none"
                  stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeOpacity={0.6}
                  markerEnd="url(#prereq-chain-arrow)"
                />
              );
            })}

            {nodes.map((node) => {
              const layout = positions.get(node.id);
              if (!layout) return null;

              const { x, y } = layout;
              const credits = DEMO_COURSE_TITLES[node.courseId]?.credits ?? 3;
              const isHovered = hoveredId === node.id;
              const fill = fillForStatus(node.status);
              const stroke = strokeForStatus(node.status);

              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(node.id)}
                  onBlur={() => setHoveredId(null)}
                  tabIndex={0}
                  role="button"
                  aria-label={`${formatCourseCode(node.courseId)}: ${DEMO_COURSE_TITLES[node.courseId]?.title ?? node.courseId}`}
                  className="cursor-default outline-none"
                >
                  <rect
                    x={x}
                    y={y}
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    ry={8}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={1.5}
                    filter={isHovered ? "url(#prereq-chain-node-shadow)" : undefined}
                  />
                  <text
                    x={x + 10}
                    y={y + 20}
                    className="station-label"
                    fill="var(--ink)"
                    style={{ fontSize: 11, fontFamily: "var(--font-barlow-condensed, var(--font-mono-accent, monospace))", fontWeight: 600 }}
                  >
                    {formatCourseCode(node.courseId)}
                  </text>
                  <text
                    x={x + 10}
                    y={y + 36}
                    fill="var(--ink-soft)"
                    style={{ fontSize: 10 }}
                  >
                    {credits} cr
                  </text>
                </g>
              );
            })}
          </svg>

          <AnimatePresence>
            {hoveredLayout ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ duration: 0.12 }}
                className="pointer-events-none absolute z-10 max-w-[200px] rounded-lg glass-panel px-2.5 py-1.5 text-[11px] leading-snug text-slate-700 shadow-md"
                style={{
                  left: hoveredLayout.x + 8,
                  top: Math.max(4, hoveredLayout.y - 36),
                }}
                role="tooltip"
              >
                {DEMO_COURSE_TITLES[hoveredLayout.node.courseId]?.title ??
                  hoveredLayout.node.courseId.replace(/-/g, " ")}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
