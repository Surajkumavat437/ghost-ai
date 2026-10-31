import assert from "node:assert/strict";
import test from "node:test";

import { getVerifiedCollaboratorEmails } from "@/lib/project-access";

test("only verified emails for the authenticated user grant collaborator lookup", async () => {
  const emails = await getVerifiedCollaboratorEmails("user_1", async () => ({
    id: "user_1",
    emailAddresses: [
      { emailAddress: "Owner@Example.com", verification: { status: "verified" } },
      { emailAddress: "pending@example.com", verification: { status: "unverified" } },
      { emailAddress: "missing-status@example.com", verification: null },
    ],
  }));

  assert.deepEqual(emails, ["owner@example.com"]);
});

test("a mismatched Clerk user does not grant collaborator lookup", async () => {
  const emails = await getVerifiedCollaboratorEmails("user_1", async () => ({
    id: "user_2",
    emailAddresses: [
      { emailAddress: "other@example.com", verification: { status: "verified" } },
    ],
  }));

  assert.deepEqual(emails, []);
});

test("a Clerk profile lookup failure does not block owner lookup", async () => {
  const emails = await getVerifiedCollaboratorEmails("user_1", async () => {
    throw new Error("Clerk unavailable");
  });

  assert.deepEqual(emails, []);
});
