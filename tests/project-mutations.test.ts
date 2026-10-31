import assert from "node:assert/strict";
import test from "node:test";

import { deleteOwnedProject } from "@/lib/project-mutations";

test("deleting an owned project uses an atomic owner-scoped delete", async () => {
  let lookupCount = 0;
  const result = await deleteOwnedProject(
    {
      deleteMany: async ({ where }) => {
        assert.deepEqual(where, { id: "project_1", ownerId: "user_1" });
        return { count: 1 };
      },
      findUnique: async () => {
        lookupCount += 1;
        return null;
      },
    },
    "project_1",
    "user_1",
  );

  assert.equal(result, "deleted");
  assert.equal(lookupCount, 0);
});

test("a concurrent delete returns not-found after the owner-scoped delete loses the race", async () => {
  const result = await deleteOwnedProject(
    {
      deleteMany: async () => ({ count: 0 }),
      findUnique: async () => null,
    },
    "project_1",
    "user_1",
  );

  assert.equal(result, "not-found");
});

test("a project that exists but belongs to another user remains forbidden", async () => {
  const result = await deleteOwnedProject(
    {
      deleteMany: async () => ({ count: 0 }),
      findUnique: async () => ({ ownerId: "user_2" }),
    },
    "project_1",
    "user_1",
  );

  assert.equal(result, "forbidden");
});
