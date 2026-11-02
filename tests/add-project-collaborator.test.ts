import assert from "node:assert/strict";
import test from "node:test";

import { addProjectCollaboratorAsOwner } from "@/lib/add-project-collaborator";

function trackingRequest() {
  const calls: string[] = [];
  const request = {
    async json() {
      calls.push("parse-body");
      return { email: "  user@example.com " };
    },
  } as Request;
  return { request, calls };
}

function dependencies(ownerId: string | null, calls: string[]) {
  return {
    async findProjectOwner(projectId: string) {
      assert.equal(projectId, "project_1");
      calls.push("find-project");
      return ownerId ? { ownerId } : null;
    },
    async createCollaborator(_projectId: string, email: string) {
      calls.push(`create:${email}`);
      return { id: "collaborator_1" } as never;
    },
    async enrichCollaborator() {
      return {
        id: "collaborator_1",
        email: "user@example.com",
        createdAt: new Date().toISOString(),
        displayName: null,
        avatarUrl: null,
      };
    },
  };
}

test("missing projects are rejected before parsing the request body", async () => {
  const fixture = trackingRequest();
  const response = await addProjectCollaboratorAsOwner(
    fixture.request,
    "project_1",
    "user_1",
    dependencies(null, fixture.calls),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(fixture.calls, ["find-project"]);
});

test("non-owners are rejected before parsing the request body", async () => {
  const fixture = trackingRequest();
  const response = await addProjectCollaboratorAsOwner(
    fixture.request,
    "project_1",
    "user_1",
    dependencies("user_2", fixture.calls),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(fixture.calls, ["find-project"]);
});

test("authorized owners parse the body after ownership and retain email validation", async () => {
  const fixture = trackingRequest();
  const response = await addProjectCollaboratorAsOwner(
    fixture.request,
    "project_1",
    "user_1",
    dependencies("user_1", fixture.calls),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(fixture.calls, ["find-project", "parse-body", "create:user@example.com"]);
});

test("authorized owners retain malformed JSON and email validation responses", async () => {
  const malformedRequest = {
    async json() { throw new SyntaxError("invalid JSON"); },
  } as unknown as Request;
  const ownerDependencies = dependencies("user_1", []);
  const malformed = await addProjectCollaboratorAsOwner(malformedRequest, "project_1", "user_1", ownerDependencies);
  assert.equal(malformed.status, 400);

  const invalidEmailRequest = {
    async json() { return { email: "invalid" }; },
  } as unknown as Request;
  const invalidEmail = await addProjectCollaboratorAsOwner(invalidEmailRequest, "project_1", "user_1", ownerDependencies);
  assert.equal(invalidEmail.status, 400);
});

test("duplicate collaborators and a concurrent project deletion keep their existing responses", async () => {
  const request = { async json() { return { email: "user@example.com" }; } } as Request;
  const duplicate = await addProjectCollaboratorAsOwner(request, "project_1", "user_1", {
    ...dependencies("user_1", []),
    async createCollaborator() { throw { code: "P2002" }; },
  });
  assert.equal(duplicate.status, 409);

  const deletedProject = await addProjectCollaboratorAsOwner(request, "project_1", "user_1", {
    ...dependencies("user_1", []),
    async createCollaborator() { throw { code: "P2003" }; },
  });
  assert.equal(deletedProject.status, 404);
});
