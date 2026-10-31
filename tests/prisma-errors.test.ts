import assert from "node:assert/strict";
import test from "node:test";

import { isPrismaRecordNotFoundError } from "@/lib/prisma-errors";

test("P2025 is recognized as a concurrent missing-record write", () => {
  assert.equal(isPrismaRecordNotFoundError({ code: "P2025" }), true);
});

test("unrelated errors are not converted to not-found responses", () => {
  assert.equal(isPrismaRecordNotFoundError({ code: "P2002" }), false);
  assert.equal(isPrismaRecordNotFoundError(new Error("database unavailable")), false);
});
