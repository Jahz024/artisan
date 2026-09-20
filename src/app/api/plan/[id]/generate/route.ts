import { requireUserId } from "@/lib/auth";
import { runPipeline } from "@/lib/agents/pipeline";
import { prisma } from "@/lib/prisma";
import { parseJsonArray, parseStoredPreferences, serializeJson } from "@/lib/plan-storage";
import type { AgentEvent, CompletedCourse } from "@/types/contracts";

type RouteContext = { params: Promise<{ id: string }> };

const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function pipelineDataAvailable(): Promise<boolean> {
  try {
    await import("@/data/cs-requirements");
    await import("@/data/timetable");
    await import("@/data/historic-offerings");
    return true;
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractCompletedCourses(preferences: ReturnType<typeof parseStoredPreferences>): CompletedCourse[] {
  if (!isRecord(preferences)) return [];
  const raw = preferences.completedCourses;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is CompletedCourse => {
    return (
      isRecord(item) &&
      typeof item.courseId === "string" &&
      typeof item.grade === "string" &&
      typeof item.credits === "number" &&
      isRecord(item.term) &&
      typeof item.term.year === "number" &&
      typeof item.term.termType === "string" &&
      typeof item.term.label === "string"
    );
  });
}

function extractInProgressCourses(preferences: ReturnType<typeof parseStoredPreferences>): string[] {
  if (!isRecord(preferences)) return [];
  const raw = preferences.inProgressCourses;
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

export async function POST(_req: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = await context.params;
  const plan = await prisma.plan.findFirst({ where: { id, userId } });
  if (!plan) {
    return new Response(JSON.stringify({ error: "Plan not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const dataReady = await pipelineDataAvailable();
  if (!dataReady) {
    return new Response(
      JSON.stringify({
        error:
          "Course data cache is not available yet. Add src/data files (cs-requirements, timetable, historic-offerings) before generating.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  await prisma.plan.update({
    where: { id },
    data: { status: "generating" },
  });

  const storedPreferences = parseStoredPreferences(plan.preferences);
  const { completedCourses: _c, inProgressCourses: _i, ...preferences } = storedPreferences;
  void _c;
  void _i;

  const completedCourses = extractCompletedCourses(storedPreferences);
  const inProgressCourses = extractInProgressCourses(storedPreferences);
  const minors = parseJsonArray<string>(plan.minors, []);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(formatSse(event, data)));
      };

      void (async () => {
        try {
          const result = await runPipeline(
            {
              studentId: userId,
              major: plan.major,
              minors,
              catalogYear: plan.catalogYear,
              completedCourses,
              inProgressCourses,
              preferences,
            },
            (event: AgentEvent) => {
              send("agent-event", event);
            }
          );

          await prisma.plan.update({
            where: { id },
            data: {
              status: "ready",
              planGraph: serializeJson(result.planGraph),
              presentationSpec: serializeJson(result.presentationSpec),
              requirementsPkg: serializeJson(result.requirementsPackage),
              experiencePkg: serializeJson(result.experiencePackage),
              theme: result.presentationSpec.suggestedArtDirection,
            },
          });

          send("complete", {
            planGraph: result.planGraph,
            presentationSpec: result.presentationSpec,
            requirementsPackage: result.requirementsPackage,
            experiencePackage: result.experiencePackage,
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Plan generation failed unexpectedly";

          await prisma.plan.update({
            where: { id },
            data: { status: "error" },
          });

          send("error", { message });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
