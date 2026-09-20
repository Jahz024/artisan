"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentEvent, AgentId, PlanGraph } from "@/types/contracts";
import {
  compareSemesters,
  computeLineAssignment,
  computeTreeLayout,
} from "@/components/plan/tree-layout";
import { playSound } from "@/lib/sounds";

/**
 * What exists on the map so far. `draw` skips anything absent from this
 * object; the `fresh*` sets mark items that should play their entrance
 * animation exactly once. A null build state means the map is finished and
 * fully interactive.
 */
export interface BuildState {
  stations: Set<string>;
  freshStations: Set<string>;
  /** Edge keys, "from>to". */
  lines: Set<string>;
  freshLines: Set<string>;
  /** Scheduler has applied status fills (completed / in progress / next). */
  status: boolean;
  /** Professors has attached ratings. */
  ratings: boolean;
  freshRatings: boolean;
  /** Presentation has placed the "You are here" marker. */
  here: boolean;
  freshHere: boolean;
  /** Node the Verifier is complaining about. */
  alert: string | null;
  /** Node sliding in from the column it was moved out of. */
  slideFrom: { id: string; dx: number } | null;
}

type Sound = "tick" | "handoff" | "done" | "warning" | "coursePlaced" | null;

interface Step {
  /** Delay in ms before this step, measured from the previous one. */
  after: number;
  sound: Sound;
  apply: (b: BuildState) => void;
}

function emptyBuild(): BuildState {
  return {
    stations: new Set(),
    freshStations: new Set(),
    lines: new Set(),
    freshLines: new Set(),
    status: false,
    ratings: false,
    freshRatings: false,
    here: false,
    freshHere: false,
    alert: null,
    slideFrom: null,
  };
}

function clone(b: BuildState): BuildState {
  return {
    stations: new Set(b.stations),
    freshStations: new Set(b.freshStations),
    lines: new Set(b.lines),
    freshLines: new Set(b.freshLines),
    status: b.status,
    ratings: b.ratings,
    freshRatings: b.freshRatings,
    here: b.here,
    freshHere: b.freshHere,
    alert: b.alert,
    slideFrom: b.slideFrom,
  };
}

/** Did this agent actually report finishing? */
function ranTo(events: AgentEvent[], agentId: AgentId): boolean {
  return events.some((e) => e.agentId === agentId && e.type === "completed");
}

/**
 * Turn the real plan graph plus the events the pipeline actually emitted into
 * an ordered list of build steps. The pipeline decides *what* happened — which
 * agents ran, whether the Verifier sent work back, which node it flagged. This
 * only decides the pacing, which follows the preview.
 */
function buildSteps(graph: PlanGraph, events: AgentEvent[]): Step[] {
  const steps: Step[] = [];
  const layout = computeTreeLayout(graph);
  const assignment = computeLineAssignment(graph, layout.positions);

  // ── Requirements: place the stations, history first ──
  const placed = graph.nodes
    .filter((n) => layout.positions.has(n.id))
    .sort((a, b) => {
      const pa = layout.positions.get(a.id)!;
      const pb = layout.positions.get(b.id)!;
      return pa.columnIndex - pb.columnIndex || pa.y - pb.y;
    });

  const past = placed.filter(
    (n) => n.status === "completed" || n.status === "in_progress"
  );
  const future = placed.filter(
    (n) => n.status !== "completed" && n.status !== "in_progress"
  );

  let first = true;
  for (const node of [...past, ...future]) {
    steps.push({
      after: first ? 300 : 140,
      sound: "tick",
      apply: (b) => {
        b.stations.add(node.id);
        b.freshStations.add(node.id);
      },
    });
    first = false;
  }

  // ── Professors: ratings appear under upcoming stations ──
  if (ranTo(events, "agent2")) {
    steps.push({
      after: 700,
      sound: "handoff",
      apply: (b) => {
        b.ratings = true;
        b.freshRatings = true;
      },
    });
  }

  // ── Scheduler: status fills, then one prerequisite chain at a time ──
  steps.push({
    after: 900,
    sound: "handoff",
    apply: (b) => {
      b.status = true;
    },
  });

  const chains = new Map<number, string[]>();
  for (const edge of graph.edges) {
    if (edge.type !== "prerequisite") continue;
    if (!layout.positions.has(edge.from) || !layout.positions.has(edge.to)) continue;
    const line = assignment.lineOf.get(edge.from) ?? 0;
    const list = chains.get(line) ?? [];
    list.push(`${edge.from}>${edge.to}`);
    chains.set(line, list);
  }

  const orderedChains = [...chains.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, keys]) => keys);

  for (const keys of orderedChains) {
    steps.push({
      after: 650,
      sound: "tick",
      apply: (b) => {
        for (const k of keys) {
          b.lines.add(k);
          b.freshLines.add(k);
        }
      },
    });
  }

  // ── Verifier: flag whatever it actually complained about, then the fix ──
  const revision = events.find((e) => e.type === "revision");
  const blocking = graph.verifierIssues.find(
    (i) => i.severity === "error" && i.nodeIds.length > 0
  );
  const flagged =
    blocking?.nodeIds.find((id) => layout.positions.has(id)) ??
    (revision
      ? graph.verifierIssues
          .flatMap((i) => i.nodeIds)
          .find((id) => layout.positions.has(id))
      : undefined);

  if (flagged) {
    steps.push({
      after: 1000,
      sound: "warning",
      apply: (b) => {
        b.alert = flagged;
      },
    });
    // The pipeline re-ran the Scheduler, so show the station moving.
    if (revision) {
      steps.push({
        after: 1800,
        sound: "coursePlaced",
        apply: (b) => {
          b.alert = null;
          b.slideFrom = { id: flagged, dx: -280 };
          b.freshStations.add(flagged);
        },
      });
    } else {
      steps.push({
        after: 1800,
        sound: null,
        apply: (b) => {
          b.alert = null;
        },
      });
    }
  }

  // ── Presentation: "You are here" ──
  if (ranTo(events, "agent4")) {
    steps.push({
      after: 900,
      sound: "handoff",
      apply: (b) => {
        b.here = true;
        b.freshHere = true;
      },
    });
  }

  return steps;
}

/**
 * Replays the plan build over the real graph.
 *
 * The pipeline streams progress events but not the graph itself — the nodes
 * and their semesters only exist once agent3 has run and the `complete` frame
 * arrives. So the steps are queued and played at the preview's pace once the
 * graph lands, rather than being dropped because the agents finished first.
 *
 * Returns null once the build is done, which is the signal to re-enable drag
 * and drop.
 */
export function usePlanBuild(
  graph: PlanGraph | null,
  events: AgentEvent[],
  enabled: boolean,
  options?: { muted?: boolean; reducedMotion?: boolean }
): { build: BuildState | null; isBuilding: boolean } {
  const [build, setBuild] = useState<BuildState | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const timers = useRef<number[]>([]);
  const played = useRef<string | null>(null);

  const muted = options?.muted ?? false;
  const reducedMotion = options?.reducedMotion ?? false;

  // Only rebuild the step list when a genuinely new graph arrives.
  const signature = useMemo(() => {
    if (!graph) return null;
    return `${graph.nodes.length}:${graph.edges.length}:${graph.nodes
      .map((n) => n.id)
      .join(",")
      .slice(0, 200)}`;
  }, [graph]);

  useEffect(() => {
    if (!enabled || !graph || !signature) return;
    if (played.current === signature) return;
    played.current = signature;

    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];

    // Nothing to draw: leave the map in its finished, interactive state.
    // `build` is already null here, so there is nothing to set.
    const steps = buildSteps(graph, events);
    if (steps.length === 0) return;

    // Seed the empty map on the next tick rather than synchronously inside
    // the effect, so this never triggers a cascading render.
    let state = emptyBuild();
    timers.current.push(
      window.setTimeout(() => {
        setBuild(state);
        setIsBuilding(true);
      }, 0)
    );

    // Reduced motion: reveal everything in order, but fast and without the
    // entrance animations (the CSS handles suppressing those).
    const scale = reducedMotion ? 0.25 : 1;

    let elapsed = 0;
    steps.forEach((step) => {
      elapsed += step.after * scale;
      timers.current.push(
        window.setTimeout(() => {
          const next = clone(state);
          // Entrance animations fire once: clear last tick's fresh markers.
          next.freshStations = new Set();
          next.freshLines = new Set();
          next.freshRatings = false;
          next.freshHere = false;
          next.slideFrom = null;
          step.apply(next);
          state = next;
          setBuild(next);
          if (step.sound && !muted && !reducedMotion) playSound(step.sound);
        }, elapsed)
      );
    });

    // Hand the map back to the user.
    elapsed += 1200 * scale;
    timers.current.push(
      window.setTimeout(() => {
        setBuild(null);
        setIsBuilding(false);
        if (!muted) playSound("done");
      }, elapsed)
    );

    return () => {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
    };
  }, [enabled, graph, signature, events, muted, reducedMotion]);

  useEffect(() => {
    const ref = timers;
    return () => {
      for (const t of ref.current) window.clearTimeout(t);
    };
  }, []);

  return { build, isBuilding };
}

export { compareSemesters };
