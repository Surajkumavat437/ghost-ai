import { auth as triggerAuth } from "@trigger.dev/sdk";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { specGenerationTokenSchema } from "@/lib/spec-generation-schema";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = specGenerationTokenSchema.safeParse(rawBody);
  if (!parsed.success) return Response.json({ error: "runId is required" }, { status: 400 });

  const taskRun = await prisma.taskRun.findFirst({
    where: { runId: parsed.data.runId, userId },
    select: { runId: true },
  });
  if (!taskRun) return Response.json({ error: "Task run not found" }, { status: 404 });

  try {
    const token = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [taskRun.runId] } },
      expirationTime: "1h",
    });
    return Response.json({ token });
  } catch (error) {
    console.error("[spec-generation] Failed to create run token", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return Response.json({ error: "Could not create task run token" }, { status: 502 });
  }
}
