/**
 * Agent Pipeline Orchestrator
 * 
 * Runs Agents 1–4 + Verifier in sequence, streaming progress events
 * to the frontend via Server-Sent Events.
 */

import type {
  AgentEvent,
  AgentId,
  RequirementsPackage,
  ExperiencePackage,
  PlanGraph,
  PresentationSpec,
  PipelineResult,
  UserPreferences,
  CompletedCourse,
} from "@/types/contracts";

import { runAgent1 } from "./agent1";
import { runAgent2 } from "./agent2";
import { runAgent3 } from "./agent3";
import { runAgent4 } from "./agent4";
import { verify } from "../verifier/checker";

export interface PipelineInput {
  studentId: string;
  major: string;
  minors: string[];
  catalogYear: string;
  completedCourses: CompletedCourse[];
  inProgressCourses: string[];
  preferences: UserPreferences;
}

type EventCallback = (event: AgentEvent) => void;

function emitEvent(
  cb: EventCallback,
  agentId: AgentId,
  type: AgentEvent["type"],
  message: string,
  progress?: number,
  data?: unknown
) {
  cb({
    agentId,
    timestamp: new Date().toISOString(),
    type,
    message,
    progress,
    data,
  });
}

const MAX_REVISION_LOOPS = 3;

export async function runPipeline(
  input: PipelineInput,
  onEvent: EventCallback
): Promise<PipelineResult> {
  const startTime = Date.now();
  const events: AgentEvent[] = [];

  const trackEvent: EventCallback = (event) => {
    events.push(event);
    onEvent(event);
  };

  // ─── Agent 1: Requirements & Availability ────────────────────────────
  emitEvent(trackEvent, "agent1", "started", "Analyzing degree requirements and course availability…");

  const requirementsPackage: RequirementsPackage = await runAgent1(input, (msg, progress) => {
    emitEvent(trackEvent, "agent1", "progress", msg, progress);
  });

  emitEvent(trackEvent, "agent1", "completed", "Requirements analysis complete.");
  emitEvent(trackEvent, "agent1", "handoff", "Handing off to Professor Analyst…", 100, {
    coursesAnalyzed: Object.keys(requirementsPackage.courseDetails).length,
    requirementsFound: requirementsPackage.requirementBlocks.length,
  });

  // ─── Agent 2: Professor & Course Experience ──────────────────────────
  emitEvent(trackEvent, "agent2", "started", "Researching professor ratings and course rigor…");

  const experiencePackage: ExperiencePackage = await runAgent2(
    requirementsPackage,
    (msg, progress) => {
      emitEvent(trackEvent, "agent2", "progress", msg, progress);
    }
  );

  emitEvent(trackEvent, "agent2", "completed", "Professor analysis complete.");
  emitEvent(trackEvent, "agent2", "handoff", "Handing off to Plan Architect…", 100, {
    instructorsRated: Object.keys(experiencePackage.instructorRatings).length,
  });

  // ─── Agent 3 + Verifier Loop ─────────────────────────────────────────
  emitEvent(trackEvent, "agent3", "started", "Building your optimal semester plan…");

  let planGraph: PlanGraph = await runAgent3(
    requirementsPackage,
    experiencePackage,
    input.preferences,
    (msg, progress) => {
      emitEvent(trackEvent, "agent3", "progress", msg, progress);
    }
  );

  emitEvent(trackEvent, "agent3", "completed", "Initial plan constructed.");

  // Verification loop
  for (let loop = 0; loop < MAX_REVISION_LOOPS; loop++) {
    emitEvent(trackEvent, "verifier", "started", `Verification pass ${loop + 1}…`);

    const issues = verify(planGraph, requirementsPackage, input.preferences);

    if (issues.length === 0) {
      planGraph.verifierPassed = true;
      planGraph.verifierIssues = [];
      emitEvent(trackEvent, "verifier", "completed", "✓ Plan passes all checks!");
      break;
    }

    planGraph.verifierPassed = false;
    planGraph.verifierIssues = issues;

    const errors = issues.filter((i) => i.severity === "error");

    if (errors.length === 0) {
      emitEvent(
        trackEvent,
        "verifier",
        "completed",
        `Plan has ${issues.length} warning(s) but no hard errors.`
      );
      break;
    }

    if (loop < MAX_REVISION_LOOPS - 1) {
      emitEvent(
        trackEvent,
        "verifier",
        "revision",
        `Found ${errors.length} issue(s). Sending back to Plan Architect for revision…`,
        undefined,
        { issues: errors }
      );

      planGraph = await runAgent3(
        requirementsPackage,
        experiencePackage,
        input.preferences,
        (msg, progress) => {
          emitEvent(trackEvent, "agent3", "progress", `[Revision ${loop + 2}] ${msg}`, progress);
        },
        issues
      );
    } else {
      emitEvent(
        trackEvent,
        "verifier",
        "completed",
        `${errors.length} issue(s) remain after ${MAX_REVISION_LOOPS} attempts. Showing to student.`
      );
    }
  }

  // ─── Agent 4: Presentation ───────────────────────────────────────────
  emitEvent(trackEvent, "agent4", "started", "Crafting your plan's visual story…");

  const presentationSpec: PresentationSpec = await runAgent4(
    planGraph,
    requirementsPackage,
    experiencePackage,
    input.preferences,
    (msg, progress) => {
      emitEvent(trackEvent, "agent4", "progress", msg, progress);
    }
  );

  emitEvent(trackEvent, "agent4", "completed", "Presentation ready!");

  return {
    planGraph,
    presentationSpec,
    requirementsPackage,
    experiencePackage,
    events,
    totalDurationMs: Date.now() - startTime,
  };
}
