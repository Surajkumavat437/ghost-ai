import { auth } from "@clerk/nextjs/server";
import { getCursorColor, getLiveblocksClient } from "@/lib/liveblocks";
import { acquireLiveblocksRoomLock } from "@/lib/liveblocks-room-lock";
import { prisma } from "@/lib/prisma";
import { getVerifiedCollaboratorEmails } from "@/lib/project-access";
import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID } from "@/types/tasks";

interface LiveblocksAuthBody {
  room: string;
}

type AuthStage = "clerk" | "request" | "project-access" | "configuration" | "liveblocks";

function jsonError(message: string, status: number) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function isLiveblocksAuthBody(value: unknown): value is LiveblocksAuthBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const room = (value as Record<string, unknown>).room;
  return typeof room === "string" && room.trim().length > 0 && room.length <= 64;
}

async function ensureRoomFeed(roomId: string, feedId: string) {
  const liveblocks = getLiveblocksClient();
  try {
    await liveblocks.getFeed({ roomId, feedId });
    return;
  } catch {
    try {
      await liveblocks.createFeed({ roomId, feedId });
      return;
    } catch {
      // A concurrent room join may have created it after our initial lookup.
      await liveblocks.getFeed({ roomId, feedId });
    }
  }
}

export async function POST(request: Request) {
  let stage: AuthStage = "clerk";
  try {
    const { userId } = await auth();
    if (!userId) return jsonError("Unauthorized", 401);

    stage = "request";
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    if (!isLiveblocksAuthBody(body)) {
      return jsonError("A project room is required", 400);
    }

    stage = "project-access";
    // Owners do not need a Clerk profile lookup to authorize their own room.
    // This keeps the common path short enough for Liveblocks' 10 second auth deadline.
    const ownedProject = await prisma.project.findFirst({
      where: { id: body.room, ownerId: userId },
      select: { id: true },
    });
    const collaboratorEmails = ownedProject ? [] : await getVerifiedCollaboratorEmails(userId);

    stage = "configuration";
    if (!process.env.LIVEBLOCKS_SECRET_KEY?.trim()) {
      return jsonError("Liveblocks server authentication is not configured", 503);
    }

    stage = "liveblocks";
    const liveblocks = getLiveblocksClient();
    const project = await prisma.$transaction(async (transaction) => {
      await acquireLiveblocksRoomLock(transaction, body.room);
      const accessibleProject = await transaction.project.findFirst({
        where: {
          id: body.room,
          OR: [
            { ownerId: userId },
            ...(collaboratorEmails.length
              ? [{ collaborators: { some: { email: { in: collaboratorEmails, mode: "insensitive" as const } } } }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (!accessibleProject) return null;

      await liveblocks.getOrCreateRoom(accessibleProject.id, { defaultAccesses: [] });
      return accessibleProject;
    });
    if (!project) return jsonError("Forbidden", 403);

    await Promise.all([
      ensureRoomFeed(project.id, AI_CHAT_FEED_ID),
      ensureRoomFeed(project.id, AI_STATUS_FEED_ID),
    ]);

    const cursorColor = getCursorColor(userId);

    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: userId,
        cursorColor,
      },
    });
    // Room storage and presence keep their existing access; feeds have their
    // own permission scope and power the shared AI chat/status feeds.
    session.allow(project.id, ["room:write", "feeds:write"]);

    const { status, body: tokenBody } = await session.authorize();
    return new Response(tokenBody, {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Liveblocks auth route failed", {
      stage,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError(
      stage === "configuration"
        ? "Liveblocks server authentication is not configured"
        : "Unable to authorize the Liveblocks room",
      stage === "configuration" ? 503 : 500,
    );
  }
}
