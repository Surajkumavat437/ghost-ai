import assert from "node:assert/strict";
import test from "node:test";

import { acquireLiveblocksRoomLock } from "@/lib/liveblocks-room-lock";

test("advisory room lock query returns a Prisma-decodable scalar", async () => {
  let queryText = "";
  let values: readonly unknown[] = [];
  const client = {
    async $queryRaw<T>(query: TemplateStringsArray, ...queryValues: unknown[]) {
      queryText = query.join("?");
      values = queryValues;
      return [{ locked: 1 }] as T;
    },
  };

  await acquireLiveblocksRoomLock(client, "project_123");

  assert.match(queryText, /WITH room_lock AS/);
  assert.match(queryText, /SELECT 1 AS locked FROM room_lock/);
  assert.match(queryText, /SELECT pg_advisory_xact_lock\(hashtextextended\(\?, 0\)\)/);
  assert.deepEqual(values, ["ghost-ai:liveblocks-room:project_123"]);
});
