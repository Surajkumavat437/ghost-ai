import { tasks } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { canAccessProject, getCurrentClerkIdentity } from "@/lib/project-access";
import { specGenerationRequestSchema } from "@/lib/spec-generation-schema";
import type { generateSpec } from "@/trigger/generate-spec";

export async function POST(request: Request) {
  const identity = await getCurrentClerkIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = specGenerationRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return Response.json({ error: "Invalid spec generation input", details: parsed.error.flatten() }, { status: 400 });
  }

  // Project identity is derived from the room invariant, never from a client projectId.
  const projectId = parsed.data.roomId;
  const project = await canAccessProject(identity.userId, identity.primaryEmail, projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  let stage: "trigger" | "record" = "trigger";
  let runId: string | undefined;
  try {
    const run = await tasks.trigger<typeof generateSpec>("generate-spec", {
      projectId: project.id,
      ...parsed.data,
    });
    runId = run.id;

    stage = "record";
    await prisma.taskRun.create({ data: { runId, projectId: project.id, userId: identity.userId } });
    return Response.json({ runId }, { status: 202 });
  } catch (error) {
    console.error("[spec-generation] Failed to trigger or record run", {
      stage,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message.slice(0, 300) : "Unknown failure",
    });
    return Response.json({
      error: stage === "trigger"
        ? "Could not queue spec generation. Check the Trigger.dev connection and confirm the task is deployed."
        : "The spec run was queued, but its access record could not be saved. Check the database connection and migrations.",
      ...(runId ? { runId } : {}),
    }, { status: 500 });
  }
}
