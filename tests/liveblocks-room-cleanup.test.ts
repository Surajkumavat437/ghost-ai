import assert from "node:assert/strict";
import test from "node:test";

import {
  getRoomCleanupRetryAt,
  isLiveblocksRoomNotFound,
  processClaimedRoomCleanup,
  type ClaimedCleanup,
  type RoomCleanupRepositoryPort,
} from "@/lib/liveblocks-room-cleanup";

const claim: ClaimedCleanup = {
  id: "cleanup_1",
  roomId: "project_1",
  attempts: 0,
  lockToken: "lock_1",
};

function createRepository({ current = true, activeProject = false }: { current?: boolean; activeProject?: boolean } = {}) {
  const calls: string[] = [];
  const repository: RoomCleanupRepositoryPort = {
    async withRoomLock(receivedClaim, callback) {
      assert.deepEqual(receivedClaim, claim);
      calls.push("lock");
      return callback({
        async isCurrentClaim() {
          calls.push("check-claim");
          return current;
        },
        async hasActiveProject() {
          calls.push("check-project");
          return activeProject;
        },
        async markCompleted() { calls.push("complete"); },
        async markCancelled() { calls.push("cancel"); },
      });
    },
    async scheduleRetry(receivedClaim, error) {
      assert.deepEqual(receivedClaim, claim);
      assert.equal(error instanceof Error, true);
      calls.push("retry");
    },
  };
  return { repository, calls };
}

test("an already deleted Liveblocks room is treated as successful cleanup", async () => {
  const fixture = createRepository();
  let deleteCount = 0;
  const result = await processClaimedRoomCleanup(claim, {
    repository: fixture.repository,
    async deleteRoom() {
      deleteCount += 1;
      throw { status: 404 };
    },
  });

  assert.equal(result, "completed");
  assert.equal(deleteCount, 1);
  assert.deepEqual(fixture.calls, ["lock", "check-claim", "check-project", "complete"]);
});

test("transient Liveblocks failures persist a retry instead of losing the cleanup", async () => {
  const fixture = createRepository();
  const result = await processClaimedRoomCleanup(claim, {
    repository: fixture.repository,
    async deleteRoom() { throw new Error("Liveblocks unavailable"); },
  });

  assert.equal(result, "failed");
  assert.deepEqual(fixture.calls, ["lock", "check-claim", "check-project", "retry"]);
});

test("cleanup never deletes a room while a project with that room ID is active", async () => {
  const fixture = createRepository({ activeProject: true });
  let deleteCount = 0;
  const result = await processClaimedRoomCleanup(claim, {
    repository: fixture.repository,
    async deleteRoom() { deleteCount += 1; },
  });

  assert.equal(result, "cancelled");
  assert.equal(deleteCount, 0);
  assert.deepEqual(fixture.calls, ["lock", "check-claim", "check-project", "cancel"]);
});

test("a stale claim does not call Liveblocks or alter the queue", async () => {
  const fixture = createRepository({ current: false });
  let deleteCount = 0;
  const result = await processClaimedRoomCleanup(claim, {
    repository: fixture.repository,
    async deleteRoom() { deleteCount += 1; },
  });

  assert.equal(result, "stale");
  assert.equal(deleteCount, 0);
  assert.deepEqual(fixture.calls, ["lock", "check-claim"]);
});

test("only 404 is considered an idempotent missing-room response", () => {
  assert.equal(isLiveblocksRoomNotFound({ status: 404 }), true);
  assert.equal(isLiveblocksRoomNotFound({ status: 500 }), false);
  assert.equal(isLiveblocksRoomNotFound(new Error("network failure")), false);
});

test("retry delays grow exponentially and cap at one day", () => {
  const epoch = 1_000_000;
  assert.equal(getRoomCleanupRetryAt(1, epoch).getTime(), epoch + 120_000);
  assert.equal(getRoomCleanupRetryAt(2, epoch).getTime(), epoch + 240_000);
  assert.equal(getRoomCleanupRetryAt(50, epoch).getTime(), epoch + 86_400_000);
});
