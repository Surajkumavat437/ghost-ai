import { auth as triggerAuth } from "@trigger.dev/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

interface DesignTokenRequestBody {
  runId: string;
}

function isDesignTokenRequestBody(value: unknown): value is DesignTokenRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    typeof (value as Record<string, unknown>).runId === "string" &&
    ((value as Record<string, unknown>).runId as string).trim().length > 0;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isDesignTokenRequestBody(body)) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const runId = body.runId.trim();
  const taskRun = await prisma.taskRun.findFirst({
    where: { runId, userId },
    select: { runId: true },
  });
  if (!taskRun) return Response.json({ error: "Task run not found" }, { status: 404 });

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [taskRun.runId] } },
    });
    return Response.json({ token });
  } catch (error) {
    console.error("[design-agent] Failed to create run token", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Could not create task run token" }, { status: 502 });
  }
}
