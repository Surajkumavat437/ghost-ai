import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteOwnedProject,
  type ProjectDeleteDatabase,
  type ProjectDeleteTransaction,
} from "@/lib/project-mutations";

function createDatabase({
  deletedCount,
  existingOwnerId = null,
  enqueueError,
}: {
  deletedCount: number;
  existingOwnerId?: string | null;
  enqueueError?: Error;
}) {
  const calls: string[] = [];
  let committed = false;
  const transaction: ProjectDeleteTransaction = {
    $queryRaw: async <T,>(query: TemplateStringsArray, ...values: unknown[]): Promise<T> => {
      assert.match(query.join(""), /pg_advisory_xact_lock/);
      assert.deepEqual(values, ["ghost-ai:liveblocks-room:project_1"]);
      calls.push("lock");
      return [] as T;
    },
    project: {
      deleteMany: async ({ where }) => {
        assert.deepEqual(where, { id: "project_1", ownerId: "user_1" });
        calls.push("delete");
        return { count: deletedCount };
      },
      findUnique: async ({ where }) => {
        assert.deepEqual(where, { id: "project_1" });
        calls.push("lookup");
        return existingOwnerId ? { ownerId: existingOwnerId } : null;
      },
    },
    liveblocksRoomCleanup: {
      upsert: async ({ where, create, update }) => {
        assert.deepEqual(where, { roomId: "project_1" });
        assert.deepEqual(create, { roomId: "project_1" });
        assert.equal(update.status, "PENDING");
        assert.equal(update.attempts, 0);
        assert.equal(update.lockToken, null);
        calls.push("enqueue");
        if (enqueueError) throw enqueueError;
      },
    },
  };
  const database: ProjectDeleteDatabase<ProjectDeleteTransaction> = {
    $transaction: async (callback) => {
      const result = await callback(transaction);
      committed = true;
      calls.push("commit");
      return result;
    },
  };

  return { database, calls, hasCommitted: () => committed };
}

test("deleting an owned project enqueues cleanup in the same transaction after delete", async () => {
  const fixture = createDatabase({ deletedCount: 1 });
  const result = await deleteOwnedProject(fixture.database, "project_1", "user_1");

  assert.equal(result, "deleted");
  assert.deepEqual(fixture.calls, ["lock", "delete", "enqueue", "commit"]);
  assert.equal(fixture.hasCommitted(), true);
});

test("cleanup is not enqueued when the owner-scoped delete loses a concurrent race", async () => {
  const fixture = createDatabase({ deletedCount: 0 });
  const result = await deleteOwnedProject(fixture.database, "project_1", "user_1");

  assert.equal(result, "not-found");
  assert.deepEqual(fixture.calls, ["lock", "delete", "lookup", "commit"]);
});

test("a project belonging to another user remains forbidden and does not enqueue cleanup", async () => {
  const fixture = createDatabase({ deletedCount: 0, existingOwnerId: "user_2" });
  const result = await deleteOwnedProject(fixture.database, "project_1", "user_1");

  assert.equal(result, "forbidden");
  assert.deepEqual(fixture.calls, ["lock", "delete", "lookup", "commit"]);
});

test("an outbox failure aborts the transaction instead of committing a deleted project without cleanup", async () => {
  const fixture = createDatabase({ deletedCount: 1, enqueueError: new Error("database unavailable") });

  await assert.rejects(deleteOwnedProject(fixture.database, "project_1", "user_1"), /database unavailable/);
  assert.deepEqual(fixture.calls, ["lock", "delete", "enqueue"]);
  assert.equal(fixture.hasCommitted(), false);
});
