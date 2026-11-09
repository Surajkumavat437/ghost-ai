import { tasks } from "@trigger.dev/sdk";
import { auth as triggerAuth } from "@trigger.dev/sdk";
import { prisma } from "@/lib/prisma";
import { getCurrentClerkIdentity } from "@/lib/project-access";
import { getAccessibleProject } from "@/lib/projects";
import type { designAgent } from "@/trigger/design-agent";

interface DesignRequestBody {
  prompt: string;
  roomId: string;
}

function isDesignRequestBody(value: unknown): value is DesignRequestBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  return typeof body.prompt === "string" && body.prompt.trim().length > 0 && body.prompt.trim().length <= 2_000 &&
    typeof body.roomId === "string" && body.roomId.trim().length > 0;
}

export async function POST(request: Request) {
  const identity = await getCurrentClerkIdentity();
  if (!identity) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isDesignRequestBody(body)) {
    return Response.json({ error: "A prompt of up to 2,000 characters and roomId are required" }, { status: 400 });
  }

  const projectId = body.roomId.trim();
  const project = await getAccessibleProject(identity.userId, projectId);
  if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

  let runId: string | undefined;
  let stage: "trigger" | "record" | "token" = "trigger";
  try {
    const run = await tasks.trigger<typeof designAgent>("design-agent", {
      prompt: body.prompt.trim(),
      roomId: projectId,
    });
    runId = run.id;

    stage = "record";
    await prisma.taskRun.create({
      data: {
        runId,
        projectId,
        userId: identity.userId,
      },
    });

    stage = "token";
    const token = await triggerAuth.createPublicToken({
      scopes: { read: { runs: [runId] } },
    });
    return Response.json({ runId, publicToken: token }, { status: 202 });
  } catch (error) {
    console.error("[design-agent] Failed to trigger or record task run", {
      stage,
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message.slice(0, 300) : "Unknown failure",
    });
    const messages = {
      trigger: "Could not queue design generation. Check the Trigger.dev connection and confirm the design-agent task is deployed.",
      record: "The design run was queued, but its access record could not be saved. Check the database connection and migrations.",
      token: "The design run was queued, but live status access could not be created. Check Trigger.dev realtime configuration.",
    };
    return Response.json({ error: messages[stage], ...(stage === "token" && runId ? { runId } : {}) }, { status: 500 });
  }
}
