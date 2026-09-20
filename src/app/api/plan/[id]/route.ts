import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  isArtDirection,
  parseJsonArray,
  parsePlanGraph,
  parsePresentationSpec,
  parseStoredPreferences,
  serializeJson,
} from "@/lib/plan-storage";
import { updatePlanSchema } from "@/lib/plan-validation";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedPlan(id: string, userId: string) {
  return prisma.plan.findFirst({
    where: { id, userId },
  });
}

export async function GET(_req: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const plan = await getOwnedPlan(id, userId);

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  return NextResponse.json({
    plan: {
      ...plan,
      minors: parseJsonArray<string>(plan.minors, []),
      preferences: parseStoredPreferences(plan.preferences),
      planGraph: parsePlanGraph(plan.planGraph),
      presentationSpec: parsePresentationSpec(plan.presentationSpec),
      editHistory: parseJsonArray<unknown>(plan.editHistory, []),
    },
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getOwnedPlan(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.theme !== undefined && !isArtDirection(data.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const plan = await prisma.plan.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.major !== undefined ? { major: data.major } : {}),
      ...(data.minors !== undefined ? { minors: serializeJson(data.minors) } : {}),
      ...(data.catalogYear !== undefined ? { catalogYear: data.catalogYear } : {}),
      ...(data.preferences !== undefined
        ? { preferences: serializeJson(data.preferences) }
        : {}),
      ...(data.theme !== undefined ? { theme: data.theme } : {}),
      ...(data.planGraph !== undefined
        ? { planGraph: serializeJson(data.planGraph) }
        : {}),
      ...(data.presentationSpec !== undefined
        ? { presentationSpec: serializeJson(data.presentationSpec) }
        : {}),
      ...(data.status !== undefined ? { status: data.status } : {}),
    },
  });

  return NextResponse.json({
    plan: {
      ...plan,
      minors: parseJsonArray<string>(plan.minors, []),
      preferences: parseStoredPreferences(plan.preferences),
      planGraph: parsePlanGraph(plan.planGraph),
      presentationSpec: parsePresentationSpec(plan.presentationSpec),
      editHistory: parseJsonArray<unknown>(plan.editHistory, []),
    },
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getOwnedPlan(id, userId);
  if (!existing) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  await prisma.plan.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
