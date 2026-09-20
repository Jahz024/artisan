"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type WheelEvent,
} from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, RotateCcw } from "lucide-react";
import type { PlanGraph, PlanNode, PresentationSpec, SemesterTerm } from "@/types/contracts";
import { TreeNode } from "@/components/plan/TreeNode";
import { TreeLegend } from "@/components/plan/TreeLegend";
import { TreeTooltip } from "@/components/plan/TreeTooltip";
import { TrashZone } from "@/components/plan/TrashZone";
import { CourseDetailPanel } from "@/components/plan/CourseDetailPanel";
import { ReplacementModal } from "@/components/plan/ReplacementModal";
import { Button } from "@/components/ui/Button";
import {
  branchColorForStatus,
  compareSemesters,
  computeTreeLayout,
  formatSemesterLabel,
  getNodePortIn,
  getNodePortOut,
  nodeFillForStatus,
  nodeStrokeForStatus,
  termKey,
  TREE_LAYOUT,
} from "@/components/plan/tree-layout";
import { cn, formatCourseCode } from "@/lib/utils";
import { useAppSounds } from "@/lib/useAppSounds";
import {
  computeSemesterTotalCredits,
  getCourseCredits,
  getNodeLevelVerifierWarnings,
} from "@/lib/plan-credits";

interface PlanVisualizationProps {
  planGraph: PlanGraph;
  presentationSpec?: PresentationSpec | null;
  onPlanChange?: (graph: PlanGraph) => void;
  semesterCreditOverrides?: Record<string, number>;
  creditSuggestionIds?: Set<string>;
  onSemesterCreditTarget?: (
    termKey: string,
    targetCredits: number,
    suggestionNodeIds: string[]
  ) => void;
}

function getChainIds(nodeId: string, edges: PlanGraph["edges"]): Set<string> {
  const ancestors = new Set<string>();
  const descendants = new Set<string>();
  const upQueue = [nodeId];
  while (upQueue.length > 0) {
    const id = upQueue.pop()!;
    for (const e of edges) {
      if (e.type !== "prerequisite") continue;
      if (e.to === id && !ancestors.has(e.from)) {
        ancestors.add(e.from);
        upQueue.push(e.from);
      }
    }
  }
  const downQueue = [nodeId];
  while (downQueue.length > 0) {
    const id = downQueue.pop()!;
    for (const e of edges) {
      if (e.type !== "prerequisite") continue;
      if (e.from === id && !descendants.has(e.to)) {
        descendants.add(e.to);
        downQueue.push(e.to);
      }
    }
  }
  return new Set([nodeId, ...ancestors, ...descendants]);
}

function canMoveTo(
  graph: PlanGraph,
  nodeId: string,
  targetTerm: SemesterTerm
): { ok: boolean; reason?: string; flashNodeId?: string } {
  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return { ok: false, reason: "Node not found" };

  const prereqs = graph.edges.filter((e) => e.to === nodeId && e.type === "prerequisite");
  for (const edge of prereqs) {
    const prereqNode = graph.nodes.find((n) => n.id === edge.from);
    if (prereqNode && compareSemesters(targetTerm, prereqNode.semester) <= 0) {
      return {
        ok: false,
        reason: `Can't move ${formatCourseCode(node.courseId)} to ${formatSemesterLabel(targetTerm)} — must come after ${formatCourseCode(prereqNode.courseId)}`,
        flashNodeId: prereqNode.id,
      };
    }
  }

  const dependents = graph.edges.filter((e) => e.from === nodeId && e.type === "prerequisite");
  for (const edge of dependents) {
    const depNode = graph.nodes.find((n) => n.id === edge.to);
    if (depNode && compareSemesters(targetTerm, depNode.semester) >= 0) {
      return {
        ok: false,
        reason: `Can't move ${formatCourseCode(node.courseId)} to ${formatSemesterLabel(targetTerm)} — must come before ${formatCourseCode(depNode.courseId)}`,
        flashNodeId: depNode.id,
      };
    }
  }

  return { ok: true };
}

function SemesterDropColumn({
  term,
  x,
  height,
}: {
  term: SemesterTerm;
  x: number;
  height: number;
}) {
  const dropId = termKey(term);
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { term } });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute top-0 rounded-xl border border-transparent transition-colors",
        isOver && "border-cyan-400/40 bg-cyan-500/5"
      )}
      style={{
        left: x - 110,
        width: 220,
        height,
      }}
      aria-hidden
    />
  );
}

function DragTreeNodePreview({ node }: { node: PlanNode }) {
  const r = TREE_LAYOUT.nodeRadius;
  return (
    <div className="flex items-center gap-2 opacity-90">
      <span
        className="rounded-full shadow-lg"
        style={{
          width: r * 2,
          height: r * 2,
          background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.22), transparent 45%), ${nodeFillForStatus(node.status)}`,
          border: `2px solid ${nodeStrokeForStatus(node.status)}`,
        }}
      />
      <span className="font-mono-accent text-xs font-bold text-white">
        {formatCourseCode(node.courseId)}
      </span>
    </div>
  );
}

export function PlanVisualization({
  planGraph,
  presentationSpec,
  onPlanChange,
  semesterCreditOverrides: _semesterCreditOverrides,
  creditSuggestionIds,
  onSemesterCreditTarget: _onSemesterCreditTarget,
}: PlanVisualizationProps) {
  const [graph, setGraph] = useState(planGraph);
  const [selectedNode, setSelectedNode] = useState<PlanNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<PlanNode | null>(null);
  const [hoverHighlight, setHoverHighlight] = useState<Set<string>>(new Set());
  const [activeDrag, setActiveDrag] = useState<PlanNode | null>(null);
  const [trashedNode, setTrashedNode] = useState<PlanNode | null>(null);
  const [replacementOpen, setReplacementOpen] = useState(false);
  const [scale, setScale] = useState(1);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [flashNodeId, setFlashNodeId] = useState<string | null>(null);
  const { play } = useAppSounds();

  useEffect(() => {
    if (!moveError) return;
    const t = window.setTimeout(() => setMoveError(null), 3000);
    return () => window.clearTimeout(t);
  }, [moveError]);

  useEffect(() => {
    if (!flashNodeId) return;
    const t = window.setTimeout(() => setFlashNodeId(null), 1200);
    return () => window.clearTimeout(t);
  }, [flashNodeId]);

  useEffect(() => {
    setGraph(planGraph);
  }, [planGraph]);

  const layout = useMemo(() => computeTreeLayout(graph), [graph]);

  const nodeMap = useMemo(() => {
    const m = new Map<string, PlanNode>();
    graph.nodes.forEach((n) => m.set(n.id, n));
    return m;
  }, [graph.nodes]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const updateGraph = useCallback(
    (next: PlanGraph) => {
      setGraph(next);
      onPlanChange?.(next);
    },
    [onPlanChange]
  );

  const applyHighlight = useCallback(
    (nodeId: string | null) => {
      if (nodeId) setHoverHighlight(getChainIds(nodeId, graph.edges));
      else if (selectedNode) setHoverHighlight(getChainIds(selectedNode.id, graph.edges));
      else setHoverHighlight(new Set());
    },
    [graph.edges, selectedNode]
  );

  const handleSelect = (node: PlanNode) => {
    setSelectedNode(node);
    setHoverHighlight(getChainIds(node.id, graph.edges));
  };

  const handleHoverNode = (node: PlanNode | null) => {
    setHoveredNode(node);
    applyHighlight(node?.id ?? null);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const node = event.active.data.current?.node as PlanNode | undefined;
    if (node) {
      setActiveDrag(node);
      setHoverHighlight(getChainIds(node.id, graph.edges));
    }
  };

  const moveNodeToTerm = (nodeId: string, term: SemesterTerm) => {
    const nodes = graph.nodes.map((n) =>
      n.id === nodeId ? { ...n, semester: term } : n
    );
    const semesters = graph.semesters.map((sg) => {
      const nodeIds = nodes
        .filter((n) => termKey(n.semester) === termKey(sg.term))
        .map((n) => n.id);
      const totalCredits = computeSemesterTotalCredits(nodeIds, nodes);
      return { ...sg, nodeIds, totalCredits };
    });
    updateGraph({ ...graph, nodes, semesters });
    play("coursePlaced");
  };

  const removeNode = (nodeId: string) => {
    const removed = graph.nodes.find((n) => n.id === nodeId);
    if (!removed) return;
    const nodes = graph.nodes.filter((n) => n.id !== nodeId);
    const edges = graph.edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
    const semesters = graph.semesters.map((sg) => {
      const nodeIds = sg.nodeIds.filter((id) => id !== nodeId);
      const totalCredits = computeSemesterTotalCredits(nodeIds, nodes);
      return { ...sg, nodeIds, totalCredits };
    });
    updateGraph({ ...graph, nodes, edges, semesters });
    setTrashedNode(removed);
    setReplacementOpen(true);
    play("courseTrashed");
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    setHoverHighlight(selectedNode ? getChainIds(selectedNode.id, graph.edges) : new Set());
    const nodeId = String(event.active.id);
    const overId = event.over?.id;

    if (overId === "trash-zone") {
      removeNode(nodeId);
      return;
    }

    if (overId && typeof overId === "string") {
      const termData = event.over?.data.current?.term as SemesterTerm | undefined;
      if (termData) {
        const check = canMoveTo(graph, nodeId, termData);
        if (!check.ok) {
          if (check.reason) setMoveError(check.reason);
          if (check.flashNodeId) setFlashNodeId(check.flashNodeId);
          play("warning");
          return;
        }
        moveNodeToTerm(nodeId, termData);
      }
    }
  };

  const handleWheel = (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setScale((s) => Math.min(1.6, Math.max(0.6, s - e.deltaY * 0.001)));
    }
  };

  const highlightActive = hoverHighlight.size > 0;

  const nodeVerifierWarningsById = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const node of graph.nodes) {
      const warnings = getNodeLevelVerifierWarnings(node.id, graph.verifierIssues);
      if (warnings.length > 0) map.set(node.id, warnings);
    }
    return map;
  }, [graph.nodes, graph.verifierIssues]);

  const branchPaths = useMemo(() => {
    return graph.edges
      .filter((e) => e.type === "prerequisite")
      .map((edge) => {
        const fromPos = layout.positions.get(edge.from);
        const toPos = layout.positions.get(edge.to);
        if (!fromPos || !toPos) return null;

        const from = getNodePortOut(fromPos);
        const to = getNodePortIn(toPos);
        const dx = to.x - from.x;
        const c1x = from.x + Math.max(48, dx * 0.42);
        const c2x = to.x - Math.max(48, dx * 0.42);
        const d = `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`;

        const inChain =
          highlightActive &&
          hoverHighlight.has(edge.from) &&
          hoverHighlight.has(edge.to);
        const toNode = nodeMap.get(edge.to);
        const status = toNode?.status ?? "planned_future";
        const stroke = branchColorForStatus(status, inChain);
        const opacity = highlightActive ? (inChain ? 0.8 : 0.1) : 0.25;
        const strokeWidth = highlightActive ? (inChain ? 2.5 : 1) : 1.5;

        return (
          <path
            key={`${edge.from}-${edge.to}`}
            d={d}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity={opacity}
            markerEnd="url(#branch-arrowhead)"
            filter={inChain ? "url(#organic-glow)" : undefined}
          />
        );
      });
  }, [graph.edges, highlightActive, hoverHighlight, layout.positions, nodeMap]);

  const electiveDecorPath = useMemo(() => {
    const electives = [...layout.positions.values()].filter((p) => p.isElective);
    if (electives.length === 0) return null;
    const minX = Math.min(...electives.map((p) => p.x));
    const maxX = Math.max(...electives.map((p) => p.x));
    const y = electives[0].y - TREE_LAYOUT.rowGap * 0.55;
    const d = `M ${minX - 40} ${y} C ${(minX + maxX) / 2} ${y + 18}, ${(minX + maxX) / 2} ${y - 12}, ${maxX + 40} ${y}`;
    return (
      <g>
        <text
          x={TREE_LAYOUT.startX - 52}
          y={y + 5}
          textAnchor="end"
          className="fill-slate-500 italic"
          style={{ fontSize: 14, fontStyle: "italic" }}
        >
          Electives
        </text>
        <path
          d={d}
          fill="none"
          stroke="rgba(148, 163, 184, 0.35)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray="6 8"
          opacity={0.5}
        />
      </g>
    );
  }, [layout.positions]);

  const semesterCreditsByKey = useMemo(() => {
    const m = new Map<string, number>();
    graph.semesters.forEach((sg) => m.set(termKey(sg.term), sg.totalCredits));
    return m;
  }, [graph.semesters]);

  const tooltipPos = hoveredNode ? layout.positions.get(hoveredNode.id) : undefined;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="relative">
        <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
          <Button
            variant="ghost"
            type="button"
            aria-label="Zoom out"
            onClick={() => setScale((s) => Math.max(0.6, s - 0.1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-xs text-slate-500 tabular-nums">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            type="button"
            aria-label="Zoom in"
            onClick={() => setScale((s) => Math.min(1.6, s + 0.1))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            type="button"
            aria-label="Reset view"
            onClick={() => setScale(1)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <TreeLegend />

        <div
          className="relative max-h-[min(75vh,780px)] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-700/40 p-4"
          style={{ backgroundColor: "#0A0E17" }}
          onWheel={handleWheel}
        >
          <motion.div
            style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}
            className="relative inline-block"
          >
            <div
              className="relative"
              style={{ width: layout.width, height: layout.height, minHeight: TREE_LAYOUT.minHeight }}
            >
              <svg
                className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
                width={layout.width}
                height={layout.height}
                viewBox={`0 0 ${layout.width} ${layout.height}`}
                aria-hidden
              >
                <defs>
                  <pattern
                    id="tree-grid"
                    width="32"
                    height="32"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 32 0 L 0 0 0 32"
                      fill="none"
                      stroke="rgba(148, 163, 184, 0.06)"
                      strokeWidth="1"
                    />
                  </pattern>
                  <filter id="organic-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <marker
                    id="branch-arrowhead"
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M0,0 L7,3.5 L0,7 Z" fill="context-stroke" />
                  </marker>
                </defs>
                <rect width="100%" height="100%" fill="url(#tree-grid)" />
                {electiveDecorPath}
                {branchPaths}
                {layout.semesterColumns.map((col) => {
                  const credits = semesterCreditsByKey.get(termKey(col.term)) ?? 0;
                  const label = `${formatSemesterLabel(col.term)} · ${credits}cr`;
                  const pillW = Math.max(120, label.length * 7.2 + 28);
                  return (
                    <g key={termKey(col.term)}>
                      <rect
                        x={col.x - pillW / 2}
                        y={col.labelY - 18}
                        width={pillW}
                        height={26}
                        rx={13}
                        fill="rgba(15, 23, 42, 0.85)"
                        stroke="rgba(148, 163, 184, 0.2)"
                        strokeWidth={1}
                      />
                      <text
                        x={col.x}
                        y={col.labelY}
                        textAnchor="middle"
                        className="fill-slate-100 font-bold"
                        style={{ fontSize: 18, fontWeight: 700 }}
                      >
                        {label}
                      </text>
                      <line
                        x1={col.x - 52}
                        y1={col.labelY + 10}
                        x2={col.x + 52}
                        y2={col.labelY + 10}
                        stroke="rgba(148, 163, 184, 0.35)"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                      />
                    </g>
                  );
                })}
              </svg>

              {layout.semesterColumns.map((col) => (
                <SemesterDropColumn
                  key={termKey(col.term)}
                  term={col.term}
                  x={col.x}
                  height={layout.height}
                />
              ))}

              {graph.nodes.map((node, index) => {
                const pos = layout.positions.get(node.id);
                if (!pos) return null;
                return (
                  <TreeNode
                    key={node.id}
                    node={node}
                    x={pos.x}
                    y={pos.y}
                    index={index}
                    onSelect={handleSelect}
                    onHover={handleHoverNode}
                    selected={selectedNode?.id === node.id}
                    highlighted={hoverHighlight.has(node.id)}
                    dimmed={highlightActive && !hoverHighlight.has(node.id)}
                    suggestionHighlight={creditSuggestionIds?.has(node.id)}
                    flashError={flashNodeId === node.id}
                    verifierWarnings={nodeVerifierWarningsById.get(node.id)}
                  />
                );
              })}

              <TreeTooltip
                node={hoveredNode}
                anchorX={tooltipPos?.x ?? 0}
                anchorY={tooltipPos?.y ?? 0}
                visible={Boolean(hoveredNode && tooltipPos && !activeDrag)}
              />
            </div>
          </motion.div>
        </div>

        <TrashZone visible={Boolean(activeDrag)} />

        <DragOverlay>
          {activeDrag ? <DragTreeNodePreview node={activeDrag} /> : null}
        </DragOverlay>

        <AnimatePresence>
          {moveError ? (
            <motion.div
              key="move-error"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="fixed bottom-8 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-xl border border-red-500/40 bg-slate-950/95 px-4 py-3 text-center text-sm text-red-100 shadow-xl backdrop-blur-md"
              role="status"
            >
              {moveError}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <CourseDetailPanel
        node={selectedNode}
        presentationSpec={presentationSpec}
        onClose={() => {
          setSelectedNode(null);
          setHoverHighlight(new Set());
        }}
        onSwapAlternative={(node, courseId, instructor) => {
          const nodes = graph.nodes.map((n) =>
            n.id === node.id ? { ...n, courseId, instructor: instructor ?? n.instructor } : n
          );
          updateGraph({ ...graph, nodes });
          setSelectedNode(null);
          play("coursePlaced");
        }}
      />

      <ReplacementModal
        open={replacementOpen}
        onClose={() => setReplacementOpen(false)}
        removedNode={trashedNode}
        onSelectReplacement={(opt) => {
          if (!trashedNode) return;
          const newNode: PlanNode = {
            ...trashedNode,
            id: `node-${opt.courseId ?? trashedNode.courseId}-${Date.now()}`,
            courseId: opt.courseId ?? trashedNode.courseId,
            instructor: opt.instructor,
            score: opt.score,
          };
          updateGraph({
            ...graph,
            nodes: [...graph.nodes, newNode],
            semesters: graph.semesters.map((sg) =>
              termKey(sg.term) === termKey(trashedNode.semester)
                ? {
                    ...sg,
                    nodeIds: [...sg.nodeIds, newNode.id],
                    totalCredits: sg.totalCredits + getCourseCredits(newNode.courseId),
                  }
                : sg
            ),
          });
          setReplacementOpen(false);
          setTrashedNode(null);
          play("coursePlaced");
        }}
      />
    </DndContext>
  );
}
