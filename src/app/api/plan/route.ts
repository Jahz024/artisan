import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlanSchema } from "@/lib/plan-validation";
import { parseJsonArray, serializeJson } from "@/lib/plan-storage";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plans = await prisma.plan.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      major: true,
      status: true,
      theme: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ plans });
}

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, major, minors, catalogYear, preferences } = parsed.data;

  const plan = await prisma.plan.create({
    data: {
      userId,
      name,
      major,
      minors: serializeJson(minors),
      catalogYear,
      preferences: serializeJson(preferences ?? {}),
      status: "draft",
    },
  });

  return NextResponse.json(
    {
      plan: {
        ...plan,
        minors: parseJsonArray<string>(plan.minors, []),
        preferences: JSON.parse(plan.preferences),
      },
    },
    { status: 201 }
  );
}
