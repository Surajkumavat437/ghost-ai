import { randomUUID } from "node:crypto";

import { getLiveblocksClient } from "@/lib/liveblocks";
import { acquireLiveblocksRoomLock } from "@/lib/liveblocks-room-lock";
import { prisma } from "@/lib/prisma";

const CLAIM_LEASE_MS = 5 * 60 * 1000;
const MAX_RETRY_DELAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 10;

export interface ClaimedCleanup {
  id: string;
  roomId: string;
  attempts: number;
  lockToken: string;
}

type CleanupClaimRow = Omit<ClaimedCleanup, "lockToken">;

export interface RoomCleanupTransactionPort {
  isCurrentClaim(): Promise<boolean>;
  hasActiveProject(): Promise<boolean>;
  markCompleted(): Promise<void>;
  markCancelled(): Promise<void>;
}

export interface RoomCleanupRepositoryPort {
  withRoomLock<T>(claim: ClaimedCleanup, callback: (transaction: RoomCleanupTransactionPort) => Promise<T>): Promise<T>;
  scheduleRetry(claim: ClaimedCleanup, error: unknown): Promise<void>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 1000);
  return String(error).slice(0, 1000);
}

export function isLiveblocksRoomNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

export function getRoomCleanupRetryAt(attempts: number, now = Date.now()): Date {
  const retryNumber = Math.max(1, attempts);
  const delay = Math.min(60_000 * 2 ** Math.min(retryNumber, 11), MAX_RETRY_DELAY_MS);
  return new Date(now + delay);
}

async function claimRoomCleanups({
  batchSize,
  roomId,
}: {
  batchSize: number;
  roomId?: string;
}): Promise<ClaimedCleanup[]> {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_LEASE_MS);
  const lockToken = randomUUID();

  const rows = await prisma.$transaction((transaction) => transaction.$queryRaw<CleanupClaimRow[]>`
    WITH candidates AS (
      SELECT id
      FROM "liveblocks_room_cleanup"
      WHERE (("status" = 'PENDING' AND "next_attempt_at" <= ${now})
         OR ("status" = 'PROCESSING' AND ("locked_at" IS NULL OR "locked_at" <= ${staleBefore})))
        AND (${roomId === undefined} OR "room_id" = ${roomId ?? ""})
      ORDER BY "next_attempt_at" ASC, "created_at" ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "liveblocks_room_cleanup" AS cleanup
    SET "status" = 'PROCESSING',
        "locked_at" = ${now},
        "lock_token" = ${lockToken}::uuid,
        "updated_at" = ${now}
    FROM candidates
    WHERE cleanup.id = candidates.id
    RETURNING cleanup.id, cleanup.room_id AS "roomId", cleanup.attempts
  `);

  return rows.map((row) => ({ ...row, lockToken }));
}

const prismaCleanupRepository: RoomCleanupRepositoryPort = {
  async withRoomLock<T>(claim: ClaimedCleanup, callback: (transaction: RoomCleanupTransactionPort) => Promise<T>) {
    return prisma.$transaction(async (transaction) => {
      await acquireLiveblocksRoomLock(transaction, claim.roomId);
      return callback({
        async isCurrentClaim() {
          const currentClaim = await transaction.liveblocksRoomCleanup.findFirst({
            where: { id: claim.id, lockToken: claim.lockToken, status: "PROCESSING" },
            select: { id: true },
          });
          return currentClaim !== null;
        },
        async hasActiveProject() {
          const project = await transaction.project.findUnique({
            where: { id: claim.roomId },
            select: { id: true },
          });
          return project !== null;
        },
        async markCompleted() {
          await transaction.liveblocksRoomCleanup.updateMany({
            where: { id: claim.id, lockToken: claim.lockToken, status: "PROCESSING" },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              lockedAt: null,
              lockToken: null,
              lastError: null,
            },
          });
        },
        async markCancelled() {
          await transaction.liveblocksRoomCleanup.updateMany({
            where: { id: claim.id, lockToken: claim.lockToken, status: "PROCESSING" },
            data: {
              status: "CANCELLED",
              completedAt: new Date(),
              lockedAt: null,
              lockToken: null,
              lastError: "Room cleanup skipped because a project with this ID is active.",
            },
          });
        },
      });
    });
  },
  async scheduleRetry(claim, error) {
    await prisma.liveblocksRoomCleanup.updateMany({
      where: { id: claim.id, lockToken: claim.lockToken, status: "PROCESSING" },
      data: {
        status: "PENDING",
        attempts: { increment: 1 },
        nextAttemptAt: getRoomCleanupRetryAt(claim.attempts + 1),
        lockedAt: null,
        lockToken: null,
        lastError: getErrorMessage(error),
      },
    });
  },
};

export async function processClaimedRoomCleanup(
  claim: ClaimedCleanup,
  dependencies: {
    repository: RoomCleanupRepositoryPort;
    deleteRoom: (roomId: string) => Promise<void>;
  },
): Promise<"completed" | "cancelled" | "stale" | "failed"> {
  try {
    return await dependencies.repository.withRoomLock(claim, async (transaction) => {
      if (!await transaction.isCurrentClaim()) return "stale";
      if (await transaction.hasActiveProject()) {
        await transaction.markCancelled();
        return "cancelled";
      }

      try {
        await dependencies.deleteRoom(claim.roomId);
      } catch (error) {
        if (!isLiveblocksRoomNotFound(error)) throw error;
      }

      await transaction.markCompleted();
      return "completed";
    });
  } catch (error) {
    try {
      await dependencies.repository.scheduleRetry(claim, error);
    } catch (retryError) {
      console.error("Unable to persist Liveblocks room cleanup retry", {
        roomId: claim.roomId,
        errorName: retryError instanceof Error ? retryError.name : "UnknownError",
      });
    }
    console.error("Liveblocks room cleanup attempt failed", {
      roomId: claim.roomId,
      error: getErrorMessage(error),
    });
    return "failed";
  }
}

export async function processLiveblocksRoomCleanups({
  batchSize = DEFAULT_BATCH_SIZE,
  roomId,
}: {
  batchSize?: number;
  roomId?: string;
} = {}) {
  const liveblocks = getLiveblocksClient();
  const claims = await claimRoomCleanups({ batchSize, roomId });
  const results = await Promise.all(claims.map((claim) => processClaimedRoomCleanup(claim, {
    repository: prismaCleanupRepository,
    deleteRoom: (targetRoomId) => liveblocks.deleteRoom(targetRoomId),
  })));

  return {
    claimed: claims.length,
    completed: results.filter((status) => status === "completed").length,
    cancelled: results.filter((status) => status === "cancelled").length,
    stale: results.filter((status) => status === "stale").length,
    failed: results.filter((status) => status === "failed").length,
  };
}
