"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react";
import type {
  PlanGraph,
  PlanNode,
  RequirementsPackage,
  SectionInfo,
} from "@/types/contracts";
import { DEMO_COURSE_TITLES } from "@/lib/demo-plan";
import { cn, formatCourseCode, termKey } from "@/lib/utils";

export interface WeeklyScheduleViewProps {
  planGraph: PlanGraph;
  requirementsPackage?: RequirementsPackage | null;
}

const DAYS = ["M", "T", "W", "R", "F"] as const;
const DAY_LABELS: Record<string, string> = {
  M: "Monday",
  T: "Tuesday",
  W: "Wednesday",
  R: "Thursday",
  F: "Friday",
};

const HOUR_START = 8;
const HOUR_END = 18;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 36;

function isMajorBlock(blockId: string, pkg?: RequirementsPackage | null) {
  const b = pkg?.requirementBlocks.find((bl) => bl.id === blockId);
  if (b) return b.category === "major";
  const id = blockId.toLowerCase();
  return (id.includes("core") || id.includes("major")) && !id.includes("elective");
}

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h ?? 0) + (m ?? 0) / 60;
}

function fmtTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour % 1) * 60);
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hh}:${m.toString().padStart(2, "0")} ${ap}`;
}

function courseTitle(courseId: string) {
  return DEMO_COURSE_TITLES[courseId]?.title ?? courseId;
}

interface ScheduleBlock {
  courseId: string;
  instructor?: string;
  day: string;
  startHour: number;
  endHour: number;
  isRequired: boolean;
}

function lookupSection(
  node: PlanNode,
  sections: SectionInfo[]
): SectionInfo | undefined {
  if (node.sectionCrn) {
    const match = sections.find((s) => s.crn === node.sectionCrn);
    if (match) return match;
  }
  return sections.find((s) => s.courseId === node.courseId);
}

const DEMO_SLOTS: { days: string; start: string; end: string }[] = [
  { days: "MWF", start: "09:05", end: "09:55" },
  { days: "TR",  start: "09:30", end: "10:45" },
  { days: "MWF", start: "10:10", end: "11:00" },
  { days: "TR",  start: "11:00", end: "12:15" },
  { days: "MWF", start: "11:15", end: "12:05" },
  { days: "TR",  start: "12:30", end: "13:45" },
  { days: "MWF", start: "12:20", end: "13:10" },
  { days: "TR",  start: "14:00", end: "15:15" },
  { days: "MWF", start: "13:25", end: "14:15" },
  { days: "TR",  start: "15:30", end: "16:45" },
  { days: "MWF", start: "14:30", end: "15:20" },
  { days: "MWF", start: "15:35", end: "16:25" },
];

function generateDemoTimes(courseId: string, index: number): { days: string; startTime: string; endTime: string } {
  const hash = (courseId.charCodeAt(0) + courseId.charCodeAt(courseId.length - 1) + index * 7) % DEMO_SLOTS.length;
  const slot = DEMO_SLOTS[hash]!;
  return { days: slot.days, startTime: slot.start, endTime: slot.end };
}

const COLORS_REQ = [
  { bg: "rgba(134,31,65,0.18)", border: "#861f41", text: "#861f41" },
  { bg: "rgba(134,31,65,0.12)", border: "#a52853", text: "#861f41" },
];

const COLORS_OPT = [
  { bg: "rgba(229,117,31,0.18)", border: "#e5751f", text: "#c45a08" },
  { bg: "rgba(47,93,168,0.18)", border: "#2f5da8", text: "#2f5da8" },
  { bg: "rgba(46,139,87,0.18)", border: "#2e8b57", text: "#2e8b57" },
  { bg: "rgba(18,122,134,0.18)", border: "#127a86", text: "#127a86" },
  { bg: "rgba(224,164,0,0.18)", border: "#c49000", text: "#8b6d00" },
];

export function WeeklyScheduleView({ planGraph, requirementsPackage }: WeeklyScheduleViewProps) {
  const semesters = planGraph.semesters;
  const [semIdx, setSemIdx] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

  const activeSem = semesters[semIdx];
  const nodeById = useMemo(() => new Map(planGraph.nodes.map((n) => [n.id, n])), [planGraph.nodes]);

  const semNodes = useMemo(() => {
    if (!activeSem) return [];
    return activeSem.nodeIds
      .map((id) => nodeById.get(id))
      .filter((n): n is PlanNode => Boolean(n));
  }, [activeSem, nodeById]);

  const requiredCourseIds = useMemo(
    () => new Set(semNodes.filter((n) => isMajorBlock(n.requirementBlockId, requirementsPackage)).map((n) => n.courseId)),
    [semNodes, requirementsPackage]
  );
  const optionalCourseIds = useMemo(
    () => semNodes.filter((n) => !isMajorBlock(n.requirementBlockId, requirementsPackage)).map((n) => n.courseId),
    [semNodes, requirementsPackage]
  );

  const [visibleOptionals, setVisibleOptionals] = useState<Set<string>>(() => new Set(optionalCourseIds));

  // When semester changes, show all optionals by default
  const semTk = activeSem ? termKey(activeSem.term) : "";
  useEffect(() => {
    setVisibleOptionals(new Set(optionalCourseIds));
  }, [semTk]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleOptional = useCallback((courseId: string) => {
    setVisibleOptionals((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }, []);

  const showAllOptionals = useCallback(() => {
    setVisibleOptionals(new Set(optionalCourseIds));
  }, [optionalCourseIds]);

  const hideAllOptionals = useCallback(() => {
    setVisibleOptionals(new Set());
  }, []);

  const visibleCourseIds = useMemo(() => {
    const s = new Set(requiredCourseIds);
    for (const id of visibleOptionals) s.add(id);
    return s;
  }, [requiredCourseIds, visibleOptionals]);

  const scheduleBlocks = useMemo(() => {
    if (!activeSem) return [];
    const sections = requirementsPackage?.currentTermSections ?? [];
    const blocks: ScheduleBlock[] = [];

    const visibleNodes = semNodes.filter((n) => visibleCourseIds.has(n.courseId));

    visibleNodes.forEach((node, i) => {
      const section = lookupSection(node, sections);
      const required = requiredCourseIds.has(node.courseId);
      let days: string;
      let startTime: string;
      let endTime: string;

      if (section?.days && section.startTime && section.endTime) {
        days = section.days;
        startTime = section.startTime;
        endTime = section.endTime;
      } else {
        const demo = generateDemoTimes(node.courseId, i);
        days = demo.days;
        startTime = demo.startTime;
        endTime = demo.endTime;
      }

      const startHour = parseTime(startTime);
      const endHour = parseTime(endTime);

      for (const ch of days) {
        if (DAYS.includes(ch as typeof DAYS[number])) {
          blocks.push({
            courseId: node.courseId,
            instructor: node.instructor,
            day: ch,
            startHour,
            endHour,
            isRequired: required,
          });
        }
      }
    });

    return blocks;
  }, [activeSem, semNodes, requirementsPackage, visibleCourseIds, requiredCourseIds]);

  const totalHours = HOUR_END - HOUR_START;
  const gridHeight = totalHours * ROW_HEIGHT;

  const colorMap = useMemo(() => {
    const map = new Map<string, { bg: string; border: string; text: string }>();
    let reqIdx = 0;
    let optIdx = 0;
    for (const n of semNodes) {
      if (map.has(n.courseId)) continue;
      if (requiredCourseIds.has(n.courseId)) {
        map.set(n.courseId, COLORS_REQ[reqIdx % COLORS_REQ.length]!);
        reqIdx++;
      } else {
        map.set(n.courseId, COLORS_OPT[optIdx % COLORS_OPT.length]!);
        optIdx++;
      }
    }
    return map;
  }, [semNodes, requiredCourseIds]);

  if (!activeSem) return null;

  return (
    <div className="glass-panel mt-6 overflow-hidden rounded-xl p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[var(--maroon)]" />
          <h3 className="font-mono-accent text-sm font-bold text-[var(--ink)]">
            Weekly Schedule
          </h3>
        </div>

        {/* Semester nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setSemIdx((i) => Math.max(0, i - 1)); setSelectedCourse(null); }}
            disabled={semIdx === 0}
            className="rounded-md p-1 text-[var(--ink-soft)] transition hover:bg-[var(--paper-sunk)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[110px] text-center font-mono-accent text-xs font-semibold text-[var(--ink)]">
            {activeSem.term.label}
          </span>
          <button
            onClick={() => { setSemIdx((i) => Math.min(semesters.length - 1, i + 1)); setSelectedCourse(null); }}
            disabled={semIdx === semesters.length - 1}
            className="rounded-md p-1 text-[var(--ink-soft)] transition hover:bg-[var(--paper-sunk)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(134,31,65,0.25)", border: "1px solid #861f41" }} />
            <span className="text-[var(--ink-soft)]">Required</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(229,117,31,0.25)", border: "1px solid #e5751f" }} />
            <span className="text-[var(--ink-soft)]">Elective</span>
          </span>
        </div>
      </div>

      {/* Course toggles for optional classes */}
      {optionalCourseIds.length > 0 && (
        <div className="mb-3 rounded-lg bg-[var(--paper-sunk)] p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-soft)]">
              Show electives on schedule
            </span>
            <div className="flex gap-1.5">
              <button
                onClick={showAllOptionals}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-raised)]"
              >
                <Eye className="h-3 w-3" /> All
              </button>
              <button
                onClick={hideAllOptionals}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-raised)]"
              >
                <EyeOff className="h-3 w-3" /> None
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {optionalCourseIds.map((cid) => {
              const active = visibleOptionals.has(cid);
              const colors = colorMap.get(cid) ?? COLORS_OPT[0]!;
              return (
                <button
                  key={cid}
                  onClick={() => toggleOptional(cid)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition",
                    active ? "ring-1 ring-offset-1" : "opacity-50"
                  )}
                  style={{
                    backgroundColor: active ? colors.bg : "transparent",
                    color: colors.text,
                    borderLeft: `3px solid ${active ? colors.border : "transparent"}`,
                    ...(active ? { ringColor: colors.border } : {}),
                  }}
                >
                  {formatCourseCode(cid)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timetable grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Day header row */}
          <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-px">
            <div style={{ height: HEADER_HEIGHT }} />
            {DAYS.map((d) => (
              <div
                key={d}
                style={{ height: HEADER_HEIGHT }}
                className="flex items-center justify-center rounded-t-md bg-[var(--paper-sunk)] text-xs font-bold text-[var(--ink)]"
              >
                {DAY_LABELS[d]}
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-px" style={{ height: gridHeight }}>
            {/* Time labels */}
            <div className="relative">
              {Array.from({ length: totalHours }, (_, i) => {
                const hour = HOUR_START + i;
                const label = hour <= 12 ? `${hour} AM` : `${hour - 12} PM`;
                return (
                  <div
                    key={hour}
                    className="absolute right-2 text-[10px] font-medium text-[var(--ink-soft)]"
                    style={{ top: i * ROW_HEIGHT - 6 }}
                  >
                    {hour === 12 ? "12 PM" : label}
                  </div>
                );
              })}
            </div>

            {/* Day columns */}
            {DAYS.map((day) => {
              const dayBlocks = scheduleBlocks.filter((b) => b.day === day);
              return (
                <div key={day} className="relative border-l border-[var(--paper-sunk)]">
                  {/* Hour gridlines */}
                  {Array.from({ length: totalHours }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-[var(--paper-sunk)]"
                      style={{ top: i * ROW_HEIGHT }}
                    />
                  ))}

                  {/* Course blocks */}
                  {dayBlocks.map((block, bi) => {
                    const top = (block.startHour - HOUR_START) * ROW_HEIGHT;
                    const height = (block.endHour - block.startHour) * ROW_HEIGHT;
                    const colors = colorMap.get(block.courseId) ?? COLORS_OPT[0]!;
                    const isSelected = selectedCourse === block.courseId;

                    return (
                      <div
                        key={`${block.courseId}-${bi}`}
                        className={cn(
                          "absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 transition-shadow",
                          isSelected && "shadow-md z-10 ring-2 ring-offset-1"
                        )}
                        style={{
                          top,
                          height: Math.max(height, 24),
                          backgroundColor: colors.bg,
                          borderLeft: `3px solid ${colors.border}`,
                          ...(isSelected ? { outlineColor: colors.border } : {}),
                        }}
                        onClick={() => setSelectedCourse(selectedCourse === block.courseId ? null : block.courseId)}
                      >
                        <div
                          className="truncate text-[11px] font-bold leading-tight"
                          style={{ color: colors.text }}
                        >
                          {formatCourseCode(block.courseId)}
                        </div>
                        {height > 32 && (
                          <div className="truncate text-[9px] leading-tight text-[var(--ink-soft)]">
                            {courseTitle(block.courseId)}
                          </div>
                        )}
                        {height > 46 && block.instructor && (
                          <div className="truncate text-[9px] leading-tight text-[var(--ink-soft)]">
                            {block.instructor}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected course detail (click-persistent, no hover) */}
      {selectedCourse && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[var(--paper-sunk)] px-3 py-2 text-xs text-[var(--ink)]">
          <span className="font-mono-accent text-sm font-bold">{formatCourseCode(selectedCourse)}</span>
          <span className="font-medium">{courseTitle(selectedCourse)}</span>
          {(() => {
            const blocks = scheduleBlocks.filter((b) => b.courseId === selectedCourse);
            const b0 = blocks[0];
            if (!b0) return null;
            const days = [...new Set(blocks.map((b) => b.day))].join("");
            return (
              <>
                <span className="text-[var(--ink-soft)]">{days}</span>
                <span className="text-[var(--ink-soft)]">{fmtTime(b0.startHour)} – {fmtTime(b0.endHour)}</span>
                {b0.instructor && <span className="text-[var(--ink-soft)]">{b0.instructor}</span>}
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    backgroundColor: b0.isRequired ? "rgba(134,31,65,0.15)" : "rgba(229,117,31,0.15)",
                    color: b0.isRequired ? "#861f41" : "#e5751f",
                  }}
                >
                  {b0.isRequired ? "Required" : "Elective"}
                </span>
              </>
            );
          })()}
          <button
            onClick={() => setSelectedCourse(null)}
            className="ml-auto text-[10px] text-[var(--ink-soft)] hover:text-[var(--ink)]"
          >
            ✕ close
          </button>
        </div>
      )}
    </div>
  );
}
