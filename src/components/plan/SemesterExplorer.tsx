"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Star } from "lucide-react";
import type {
  ExperiencePackage,
  PlanGraph,
  PlanNode,
  RequirementsPackage,
  SemesterTerm,
  UserPreferences,
} from "@/types/contracts";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import { creditsForNode, getCourseCredits, sumSemesterCredits } from "@/lib/plan-credits";
import { cn, formatCourseCode, termKey } from "@/lib/utils";

export interface SemesterExplorerProps {
  planGraph: PlanGraph;
  requirementsPackage?: RequirementsPackage | null;
  experiencePackage?: ExperiencePackage | null;
  preferences: UserPreferences;
  onPlanChange?: (graph: PlanGraph) => void;
  onSelectionsChange?: (selectedCourseIds: string[]) => void;
}

type ElectiveOption = {
  courseId: string;
  instructor?: string;
  score: number;
  reason: string;
  node?: PlanNode;
};

interface ElectiveGroup {
  blockId: string;
  title: string;
  pick: number;
  options: ElectiveOption[];
  anchor?: PlanNode;
  selected: string | undefined;
}

const ELECTIVE_CATS = new Set(["elective", "pathways", "free_elective"]);
const NODE_R = 18;
const NODE_GAP = 150;
const GROUP_GAP = 20;
const COLS_PER_ROW = 5;
const COL_WIDTH = 140;
const ROW_HEIGHT_OPT = 110;
const OPTION_R = 20;

const LINE_COLORS = [
  "var(--l0)", "var(--l1)", "var(--l2)",
  "var(--l3)", "var(--l4)", "var(--l5)",
];

function blockFor(id: string, pkg?: RequirementsPackage | null) {
  return pkg?.requirementBlocks.find((b) => b.id === id);
}

function isMajorBlock(blockId: string, pkg?: RequirementsPackage | null) {
  const b = blockFor(blockId, pkg);
  if (b) return b.category === "major";
  const id = blockId.toLowerCase();
  return (id.includes("core") || id.includes("major")) && !id.includes("elective");
}

function isElectiveBlock(blockId: string, pkg?: RequirementsPackage | null) {
  const b = blockFor(blockId, pkg);
  if (b) return ELECTIVE_CATS.has(b.category);
  const id = blockId.toLowerCase();
  return id.includes("elective") || id.includes("pathways") || id.includes("free");
}

function courseTitle(courseId: string, pkg?: RequirementsPackage | null) {
  return DEMO_COURSE_TITLES[courseId]?.title ?? pkg?.courseDetails[courseId]?.title ?? courseId;
}

function difficultyTag(courseId: string, exp?: ExperiencePackage | null) {
  const avg = exp?.courseRigorSummaries[courseId]?.averageDifficulty;
  if (avg == null || (avg >= 2.5 && avg < 3.5)) return { label: "Moderate", color: "var(--line-yellow)" };
  if (avg < 2.5) return { label: "Easy", color: "var(--line-green)" };
  return { label: "Hard", color: "var(--danger)" };
}

function topReason(node: PlanNode) {
  const sb = node.scoreBreakdown;
  const ranked: [string, number][] = [
    ["Strong professor fit", sb.rating],
    ["Matches rigor preference", sb.rigorMatch],
    ["Schedule-friendly", sb.timeFit],
    ["Keeps graduation on track", sb.graduationSpeed],
  ];
  ranked.sort((a, b) => b[1] - a[1]);
  return ranked[0]![0];
}

function rmpRating(name: string | undefined, exp?: ExperiencePackage | null) {
  return name && exp?.instructorRatings[name] ? exp.instructorRatings[name].overallRating : null;
}

function buildElectiveOptions(blockId: string, semesterNodes: PlanNode[], pkg?: RequirementsPackage | null) {
  const anchor = semesterNodes.find((n) => n.requirementBlockId === blockId);
  const block = blockFor(blockId, pkg);
  const seen = new Set<string>();
  const options: ElectiveOption[] = [];
  const push = (opt: ElectiveOption) => {
    if (seen.has(opt.courseId)) return;
    seen.add(opt.courseId);
    options.push(opt);
  };
  if (anchor) {
    push({ courseId: anchor.courseId, instructor: anchor.instructor, score: anchor.score, reason: topReason(anchor), node: anchor });
    for (const alt of anchor.alternatives) {
      if (alt.courseId) push({ courseId: alt.courseId, instructor: alt.instructor, score: alt.score, reason: alt.reason, node: anchor });
    }
  }
  for (const cid of block?.eligibleCourses ?? []) {
    push({ courseId: cid, score: anchor?.score ?? 72, reason: block?.name ? `Counts toward ${block.name}` : "Eligible elective", node: anchor });
  }
  return options.sort((a, b) => b.score - a.score);
}

function plannableSemesters(graph: PlanGraph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  return graph.semesters.filter((sg) => sg.nodeIds.some((id) => byId.get(id)?.status !== "completed"));
}

function isCurrentTerm(term: SemesterTerm, graph: PlanGraph, pkg?: RequirementsPackage | null) {
  if (pkg?.currentTerm) return termKey(term) === termKey(pkg.currentTerm);
  return graph.nodes.some((n) => n.status === "in_progress" && termKey(n.semester) === termKey(term));
}

export function SemesterExplorer({
  planGraph,
  requirementsPackage,
  experiencePackage,
  preferences,
  onPlanChange,
  onSelectionsChange,
}: SemesterExplorerProps) {
  const tabs = useMemo(() => plannableSemesters(planGraph), [planGraph]);
  const defaultTk = useMemo(() => {
    const current = tabs.find((t) => isCurrentTerm(t.term, planGraph, requirementsPackage));
    const next = tabs.find((t) => t.nodeIds.some((id) => planGraph.nodes.find((n) => n.id === id)?.status === "planned_next"));
    return termKey((current ?? next ?? tabs[0])?.term ?? planGraph.semesters[0]!.term);
  }, [tabs, planGraph, requirementsPackage]);

  const [activeTk, setActiveTk] = useState(defaultTk);
  const [selectedElectives, setSelectedElectives] = useState<Set<string>>(new Set());
  const [hoveredOption, setHoveredOption] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const nodeById = useMemo(() => new Map(planGraph.nodes.map((n) => [n.id, n])), [planGraph.nodes]);
  const activeSemester = tabs.find((t) => termKey(t.term) === activeTk) ?? tabs[0];

  const semesterNodes = useMemo(() => {
    if (!activeSemester) return [];
    return activeSemester.nodeIds.map((id) => nodeById.get(id)).filter((n): n is PlanNode => Boolean(n));
  }, [activeSemester, nodeById]);

  const requiredNodes = semesterNodes.filter((n) => isMajorBlock(n.requirementBlockId, requirementsPackage));

  const electiveGroups: ElectiveGroup[] = useMemo(() => {
    const blockIds = new Set(semesterNodes.filter((n) => isElectiveBlock(n.requirementBlockId, requirementsPackage)).map((n) => n.requirementBlockId));
    for (const b of requirementsPackage?.requirementBlocks ?? []) {
      if (ELECTIVE_CATS.has(b.category) && b.remaining > 0) blockIds.add(b.id);
    }
    return [...blockIds].map((blockId) => {
      const block = blockFor(blockId, requirementsPackage);
      const allOptions = buildElectiveOptions(blockId, semesterNodes, requirementsPackage);
      const options = allOptions.slice(0, 3);
      const anchor = semesterNodes.find((n) => n.requirementBlockId === blockId);
      const selected = options.find((o) => selectedElectives.has(o.courseId))?.courseId ?? undefined;
      return { blockId, title: block?.name ?? blockId.replace(/-/g, " "), pick: block?.remaining ?? block?.coursesNeeded ?? 1, options, anchor, selected };
    }).filter((g) => g.options.length > 0).slice(0, 3);
  }, [semesterNodes, requirementsPackage, selectedElectives, activeTk]);

  const displayNodes = useMemo(
    () =>
      semesterNodes.map((n) => {
        if (!isElectiveBlock(n.requirementBlockId, requirementsPackage)) return n;
        const group = electiveGroups.find((g) => g.blockId === n.requirementBlockId);
        const sel = group?.options.find((o) => selectedElectives.has(o.courseId));
        if (!sel || sel.courseId === n.courseId) return n;
        return { ...n, courseId: sel.courseId, instructor: sel.instructor ?? n.instructor, score: sel.score ?? n.score };
      }),
    [semesterNodes, selectedElectives, electiveGroups, requirementsPackage]
  );

  const totalCredits = sumSemesterCredits(displayNodes);
  const creditCap = preferences.semesterCreditOverrides?.[activeTk] ?? preferences.creditLoadMax;
  const conflicts = planGraph.verifierIssues.filter((i) => i.severity === "error" && i.nodeIds.some((id) => activeSemester?.nodeIds.includes(id)));

  const applySelection = useCallback(
    (_blockId: string, courseId: string) => {
      setSelectedElectives((prev) => {
        const next = new Set(prev);
        if (next.has(courseId)) {
          next.delete(courseId);
        } else {
          next.add(courseId);
        }
        return next;
      });
      setSelectedDetail(courseId);
    },
    []
  );

  // Notify parent of currently selected elective courses
  useEffect(() => {
    if (!onSelectionsChange) return;
    onSelectionsChange([...selectedElectives]);
  }, [selectedElectives, onSelectionsChange]);

  // ── SVG graph layout ──────────────────────────────────────────────
  const graphLayout = useMemo(() => {
    const padX = 60;
    const reqY = 70;
    const reqStartX = padX;

    const reqPositions = requiredNodes.map((node, i) => ({
      node,
      x: reqStartX + i * NODE_GAP + NODE_GAP / 2,
      y: reqY,
    }));

    const reqWidth = requiredNodes.length * NODE_GAP;

    let groupStartY = reqY + 60 + GROUP_GAP;
    const groupLayouts: Array<{
      group: ElectiveGroup;
      junctionX: number;
      junctionY: number;
      lineColor: string;
      options: Array<{ courseId: string; x: number; y: number; selected: boolean }>;
    }> = [];

    let maxWidth = reqWidth + padX * 2;

    electiveGroups.forEach((group, gi) => {
      const count = Math.min(group.options.length, 5);
      const cols = Math.min(count, COLS_PER_ROW);
      const rows = Math.ceil(count / COLS_PER_ROW);
      const totalWidth = (cols - 1) * COL_WIDTH;
      const centerX = Math.max(padX + totalWidth / 2 + 40, (reqWidth + padX * 2) / 2);
      const junctionY = groupStartY;
      const lineColor = LINE_COLORS[gi % LINE_COLORS.length]!;

      const optPositions = group.options.slice(0, 5).map((opt, oi) => {
        const col = oi % COLS_PER_ROW;
        const row = Math.floor(oi / COLS_PER_ROW);
        return {
          courseId: opt.courseId,
          x: centerX - totalWidth / 2 + col * COL_WIDTH,
          y: junctionY + 65 + row * ROW_HEIGHT_OPT,
          selected: selectedElectives.has(opt.courseId),
        };
      });

      const rightEdge = (optPositions.reduce((mx, p) => Math.max(mx, p.x), 0)) + 80;
      maxWidth = Math.max(maxWidth, rightEdge);

      groupLayouts.push({ group, junctionX: centerX, junctionY, lineColor, options: optPositions });
      groupStartY = junctionY + 65 + rows * ROW_HEIGHT_OPT + 40;
    });

    const svgHeight = groupStartY + 20;
    const svgWidth = Math.max(maxWidth, 600);

    return { reqPositions, groupLayouts, svgWidth, svgHeight, reqY, padX };
  }, [requiredNodes, electiveGroups, selectedElectives]);

  if (!activeSemester) {
    return <div className="glass-panel rounded-2xl p-6 text-sm text-slate-600">No future semesters in this plan yet.</div>;
  }

  return (
    <div className="mt-8 space-y-4">
      {/* Semester tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const tk = termKey(tab.term);
          const active = tk === activeTk;
          const current = isCurrentTerm(tab.term, planGraph, requirementsPackage);
          return (
            <button
              key={tk}
              type="button"
              onClick={() => setActiveTk(tk)}
              className={cn(
                "shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-[var(--maroon)] bg-[var(--maroon)] text-white shadow-sm"
                  : "glass-panel text-slate-700 hover:border-[var(--orange)]/40"
              )}
            >
              {tab.term.label}
              {current ? <span className={cn("ml-2 text-xs font-medium", active ? "text-white/80" : "text-[var(--orange)]")}>Current</span> : null}
            </button>
          );
        })}
      </div>

      {/* Summary line */}
      <div className="flex flex-wrap items-center gap-4 px-1 text-sm">
        <span className="font-display text-base font-bold text-slate-900">{activeSemester.term.label}</span>
        <span className="text-slate-600">{displayNodes.length} courses · {totalCredits} credits</span>
        {totalCredits > creditCap ? (
          <span className="flex items-center gap-1 text-[var(--danger)]"><AlertTriangle className="h-4 w-4" aria-hidden />Over your {creditCap} cr target</span>
        ) : null}
        {conflicts.length > 0 ? (
          <span className="flex items-center gap-1 text-[var(--danger)]"><AlertTriangle className="h-4 w-4" aria-hidden />{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""}</span>
        ) : null}
      </div>

      {/* SVG graph */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTk}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          <div className="glass-panel overflow-x-auto rounded-2xl p-4">
            <svg
              width={graphLayout.svgWidth}
              height={graphLayout.svgHeight}
              viewBox={`0 0 ${graphLayout.svgWidth} ${graphLayout.svgHeight}`}
              className="min-w-full"
            >
              <defs>
                <filter id="se-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="var(--ink)" floodOpacity="0.15" />
                </filter>
              </defs>

              {/* ── REQUIRED COURSES: "Major Requirement" ── */}
              {requiredNodes.length > 0 ? (
                <>
                  <text
                    x={graphLayout.padX}
                    y={graphLayout.reqY - 40}
                    fill="var(--maroon)"
                    className="font-display"
                    style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.05em" }}
                  >
                    MAJOR REQUIREMENT
                  </text>

                  {/* Track line connecting required nodes */}
                  {graphLayout.reqPositions.length > 1 ? (
                    <line
                      x1={graphLayout.reqPositions[0]!.x}
                      y1={graphLayout.reqY}
                      x2={graphLayout.reqPositions[graphLayout.reqPositions.length - 1]!.x}
                      y2={graphLayout.reqY}
                      stroke="var(--maroon)"
                      strokeWidth={4}
                      strokeLinecap="round"
                      opacity={0.3}
                    />
                  ) : null}

                  {/* Required station nodes */}
                  {graphLayout.reqPositions.map(({ node, x, y }) => {
                    const credits = DEMO_COURSE_TITLES[node.courseId]?.credits ?? 3;
                    const isInProgress = node.status === "in_progress";
                    const isCompleted = node.status === "completed";
                    return (
                      <g key={node.id}>
                        <circle
                          cx={x}
                          cy={y}
                          r={NODE_R}
                          fill={isCompleted ? "var(--paper-sunk)" : isInProgress ? "var(--line-green)" : "var(--maroon)"}
                          stroke={isCompleted ? "var(--ink-soft)" : isInProgress ? "var(--line-green)" : "var(--maroon)"}
                          strokeWidth={2.5}
                          filter="url(#se-shadow)"
                        />
                        {isCompleted ? (
                          <path d={`M${x - 4},${y} L${x - 1},${y + 3} L${x + 5},${y - 3}`} stroke="var(--ink-soft)" strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        ) : null}
                        <text
                          x={x}
                          y={y + NODE_R + 18}
                          textAnchor="middle"
                          fill="var(--ink)"
                          className="station-label"
                          style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {formatCourseCode(node.courseId)}
                        </text>
                        <text
                          x={x}
                          y={y + NODE_R + 34}
                          textAnchor="middle"
                          fill="var(--ink-soft)"
                          style={{ fontSize: 12 }}
                        >
                          {credits} cr
                        </text>
                      </g>
                    );
                  })}
                </>
              ) : null}

              {/* ── ELECTIVE GROUPS: branching options ── */}
              {graphLayout.groupLayouts.map(({ group, junctionX, junctionY, lineColor, options }) => (
                <g key={group.blockId}>
                  {/* Group label */}
                  <text
                    x={junctionX}
                    y={junctionY - 30}
                    textAnchor="middle"
                    fill={lineColor}
                    className="font-display"
                    style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.03em" }}
                  >
                    {group.title.toUpperCase()}
                  </text>
                  <text
                    x={junctionX}
                    y={junctionY - 16}
                    textAnchor="middle"
                    fill="var(--ink-soft)"
                    style={{ fontSize: 11, fontStyle: "italic" }}
                  >
                    Pick {group.pick} — click to select
                  </text>

                  {/* Junction node */}
                  <circle
                    cx={junctionX}
                    cy={junctionY}
                    r={8}
                    fill={lineColor}
                    opacity={0.5}
                  />

                  {/* Branch lines from junction to each option */}
                  {options.map((opt) => {
                    const isSelected = opt.selected;
                    return (
                      <path
                        key={`branch-${opt.courseId}`}
                        d={`M ${junctionX} ${junctionY + 8} C ${junctionX} ${junctionY + 35}, ${opt.x} ${opt.y - 35}, ${opt.x} ${opt.y - OPTION_R}`}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth={isSelected ? 3 : 1.5}
                        strokeLinecap="round"
                        opacity={isSelected ? 0.9 : hoveredOption === opt.courseId ? 0.7 : 0.25}
                        style={{ transition: "opacity 0.2s, stroke-width 0.2s" }}
                      />
                    );
                  })}

                  {/* Option nodes */}
                  {options.map((opt) => {
                    const isSelected = opt.selected;
                    const optData = group.options.find((o) => o.courseId === opt.courseId);
                    const credits = getCourseCredits(opt.courseId);
                    const diff = difficultyTag(opt.courseId, experiencePackage);
                    const rating = rmpRating(optData?.instructor, experiencePackage);
                    const isHovered = hoveredOption === opt.courseId;

                    return (
                      <g
                        key={opt.courseId}
                        className="cursor-pointer"
                        onClick={() => applySelection(group.blockId, opt.courseId)}
                            onMouseEnter={() => setHoveredOption(opt.courseId)}
                            onMouseLeave={() => setHoveredOption(null)}
                            role="button"
                            tabIndex={0}
                            aria-label={`Select ${formatCourseCode(opt.courseId)}`}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); applySelection(group.blockId, opt.courseId); } }}
                      >
                        {/* Selection ring */}
                        {isSelected ? (
                          <circle
                            cx={opt.x}
                            cy={opt.y}
                            r={OPTION_R + 5}
                            fill="none"
                            stroke="var(--orange)"
                            strokeWidth={2.5}
                            opacity={0.8}
                          />
                        ) : null}

                        {/* Hover ring */}
                        {isHovered && !isSelected ? (
                          <circle
                            cx={opt.x}
                            cy={opt.y}
                            r={OPTION_R + 4}
                            fill="none"
                            stroke={lineColor}
                            strokeWidth={1.5}
                            opacity={0.5}
                            strokeDasharray="4 3"
                          />
                        ) : null}

                        {/* Node circle */}
                        <circle
                          cx={opt.x}
                          cy={opt.y}
                          r={OPTION_R}
                          fill={isSelected ? lineColor : "var(--paper-raised)"}
                          stroke={lineColor}
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          filter={isHovered || isSelected ? "url(#se-shadow)" : undefined}
                          style={{ transition: "fill 0.2s" }}
                        />

                        {/* Check mark for selected */}
                        {isSelected ? (
                          <path
                            d={`M${opt.x - 3.5},${opt.y} L${opt.x - 1},${opt.y + 3} L${opt.x + 4},${opt.y - 3}`}
                            stroke="var(--paper-raised)"
                            strokeWidth={2}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ) : null}

                        {/* Course code label */}
                        <text
                          x={opt.x}
                          y={opt.y + OPTION_R + 18}
                          textAnchor="middle"
                          fill={isSelected ? "var(--ink)" : "var(--ink-soft)"}
                          className="station-label"
                          style={{ fontSize: 15, fontWeight: isSelected ? 700 : 600, fontFamily: "var(--font-barlow-condensed)" }}
                        >
                          {formatCourseCode(opt.courseId)}
                        </text>

                        {/* Credits */}
                        <text
                          x={opt.x}
                          y={opt.y + OPTION_R + 34}
                          textAnchor="middle"
                          fill="var(--ink-soft)"
                          style={{ fontSize: 12 }}
                        >
                          {credits} cr
                        </text>

                        {/* Difficulty dot + label */}
                        <circle cx={opt.x - 20} cy={opt.y + OPTION_R + 48} r={4} fill={diff.color} />
                        <text
                          x={opt.x - 12}
                          y={opt.y + OPTION_R + 52}
                          fill="var(--ink-soft)"
                          style={{ fontSize: 12 }}
                        >
                          {diff.label}
                        </text>

                        {/* Professor rating */}
                        {rating != null ? (
                          <text
                            x={opt.x}
                            y={opt.y + OPTION_R + 68}
                            textAnchor="middle"
                            fill="var(--orange)"
                            style={{ fontSize: 12, fontWeight: 600 }}
                          >
                            ★ {rating.toFixed(1)}
                          </text>
                        ) : null}
                      </g>
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>

          {/* Course detail card — persists on selection, updates on hover */}
          {(hoveredOption || selectedDetail) ? (
            <motion.div
              key={hoveredOption ?? selectedDetail}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 glass-panel rounded-xl p-3"
            >
              {(() => {
                const detailId = hoveredOption ?? selectedDetail;
                const opt = electiveGroups.flatMap((g) => g.options).find((o) => o.courseId === detailId);
                if (!opt || !detailId) return null;
                const diff = difficultyTag(detailId, experiencePackage);
                const rating = rmpRating(opt.instructor, experiencePackage);
                return (
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="font-mono-accent text-base font-bold text-slate-900">{formatCourseCode(detailId)}</span>
                    <span className="font-semibold text-slate-800">{courseTitle(detailId, requirementsPackage)}</span>
                    <span className="text-slate-600">{getCourseCredits(detailId)} credits</span>
                    <span style={{ color: diff.color }} className="font-semibold">{diff.label}</span>
                    {opt.instructor ? <span className="text-slate-600">{opt.instructor}{rating != null ? ` ★ ${rating.toFixed(1)}` : ""}</span> : null}
                    <span className="text-slate-500">{opt.reason}</span>
                    <span className="font-mono-accent text-slate-600">fit {opt.score}</span>
                  </div>
                );
              })()}
            </motion.div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
