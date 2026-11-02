import { processLiveblocksRoomCleanups } from "@/lib/liveblocks-room-cleanup";

const BATCH_SIZE = 10;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return jsonError("Cleanup scheduler is not configured", 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return jsonError("Unauthorized", 401);
  }

  try {
    const result = await processLiveblocksRoomCleanups({ batchSize: BATCH_SIZE });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Liveblocks cleanup worker invocation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return jsonError("Cleanup worker is temporarily unavailable", 503);
  }
}
