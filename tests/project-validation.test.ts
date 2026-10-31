import assert from "node:assert/strict";
import test from "node:test";

import { validateProjectName } from "@/lib/project-validation";

test("project names are trimmed before persistence", () => {
  assert.deepEqual(validateProjectName("  Payments Platform  "), {
    name: "Payments Platform",
    error: null,
  });
});

test("project names reject missing, non-string, and whitespace-only values", () => {
  assert.equal(validateProjectName(undefined).name, null);
  assert.equal(validateProjectName(123).name, null);
  assert.equal(validateProjectName("   ").name, null);
});

test("project names reject values over the supported length", () => {
  assert.equal(validateProjectName("x".repeat(101)).name, null);
  assert.equal(validateProjectName("x".repeat(100)).name?.length, 100);
});
