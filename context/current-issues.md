# Task: Carefully Resolve All CodeRabbit Review Findings

You are working on my existing Ghost AI project. I have provided a CodeRabbit review containing major, minor, inline, and nitpick findings.

Your task is to investigate and resolve all **valid findings** from that review without introducing regressions, breaking existing functionality, or making unnecessary changes.

This is an existing application with working features. Treat stability and backward compatibility as priorities.

## 1. Mandatory rules

Before making any changes:

- Inspect the relevant source files, surrounding code, related routes, components, Trigger.dev tasks, database schema, and existing implementations.
- Understand how the affected functionality currently works and how the proposed change could affect other parts of the application.
- Verify every CodeRabbit finding against the actual code. Do not blindly trust review suggestions.
- Check whether an issue has already been fixed or whether the suggested change would introduce a new problem.
- Reuse existing project patterns, utilities, authentication checks, error handling, and APIs wherever possible.
- Do not invent undocumented APIs, configuration options, database fields, or Trigger.dev methods.
- If a finding is incorrect, already resolved, or unsafe to implement as suggested, explain why instead of forcing a change.

**Strictly avoid:**
- Unnecessary refactoring or restructuring.
- Rewriting entire files when a small targeted change is sufficient.
- Changing unrelated components, APIs, database models, or application behavior.
- Removing existing functionality to make a review finding disappear.
- Introducing new dependencies unless absolutely necessary.
- Changing UI design or styling beyond what the finding requires.
- Modifying environment variables or secrets unnecessarily.
- Committing, pushing, or deploying changes.

## 2. Execution strategy

Work through the following phases in order. Do not make all changes simultaneously.

For each phase:

1. Inspect all relevant findings.
2. Identify their root causes and dependencies.
3. Explain the proposed changes briefly.
4. Implement the smallest safe fix.
5. Run relevant tests and checks.
6. Inspect the resulting diff.
7. Confirm that existing behavior remains intact before proceeding.

If a change requires a migration, architectural modification, or a potentially destructive operation, investigate its impact and existing recovery mechanisms before implementing it.

---

# Phase 1: Security and authorization

Prioritize security issues before cosmetic or documentation changes.

### A. Project access and verified collaborator identity

Files:
- `app/api/ai/design/route.ts`
- `app/api/ai/spec/route.ts`

Investigate collaborator authorization based on Clerk email addresses.

Requirements:
- Never authorize project access using an unverified primary email address.
- Use the existing verified identity and project-access mechanisms.
- Use `getAccessibleProject` where appropriate instead of relying on an unsafe email-based access check.
- Preserve existing owner access and legitimate verified collaborator access.
- Preserve existing 404 behavior when access is denied.
- Do not unnecessarily change the authentication flow.

### B. AI design and specification task token authorization

Files:
- `app/api/ai/design/token/route.ts`
- The corresponding specification token route.

Before issuing a Trigger.dev public token for a task run:
- Authenticate the requesting user.
- Retrieve the task run's associated project.
- Verify that the requester currently has access to that project.
- Apply the same authorization principle to specification task runs.
- Do not issue tokens merely because a task run ID is known.

Reuse existing project-access utilities and avoid duplicating authorization logic.

### C. Chat session authorization

Files:
- `.agents/skills/trigger-authoring-chat-agent/SKILL.md`
- Matching `.claude` skill copy.

Inspect the documented implementation and ensure:
- The caller's access is verified before `startChatSession`.
- `mintChatAccessToken` authenticates the caller and verifies access to the requested chat before calling `auth.createPublicToken`.
- Existing identity and chat-access checks are reused.
- A user cannot obtain a session token for another user's chat.

If the skill documents behavior that is not implemented in the application, do not invent an application implementation without identifying the appropriate existing integration point.

### D. Authorization at mutation time

File:
- `trigger/design-agent.ts`

Investigate whether a collaborator who loses project access while an AI design task is running can still modify or delete the canvas.

Requirements:
- Carry the initiating collaborator's identity into the design task.
- Recheck authorization at the appropriate mutation synchronization boundary.
- Prevent a revoked collaborator's pending task from modifying project data.
- Preserve legitimate owner and collaborator workflows.
- Account for task retries and overlapping executions.

Do not rely solely on authorization performed when the task was initially queued.

---

# Phase 2: Durable task execution and data integrity

These findings can affect paid AI generations, task recovery, project data, and stored files. Be especially careful.

### A. Design task creation and recovery

File:
- `app/api/ai/design/route.ts`

Investigate the lifecycle around `taskRun.create`.

Requirements:
- Ensure queued tasks remain recoverable if recording their run information fails.
- Establish durable ownership and tracking before a task can mutate the canvas.
- Avoid leaving an untracked task that can still modify project data.
- Preserve existing retry and recovery behavior.
- Ensure a retry does not accidentally create duplicate paid AI generations.
- Handle partial failures explicitly.

Do not introduce a new task lifecycle or database structure without first inspecting the existing implementation.

### B. Specification task creation and recovery

File:
- `app/api/ai/spec/route.ts`

Requirements:
- Ensure specification runs remain recoverable if run tracking fails.
- Reconcile retries with the original run ID where possible.
- Prevent duplicate specification generation.
- Preserve existing subscriptions, progress reporting, and completion behavior.

### C. Specification storage cleanup

Files:
- `trigger/generate-spec.ts`
- `prisma/migrations/20261107160000_project_specs/migration.sql`

Investigate the lifecycle of private Markdown files stored in Vercel Blob.

Requirements:
- If a project is deleted, preserve the affected private specification Blob URLs in a durable cleanup record before metadata is cascaded away.
- Reuse the existing Blob cleanup mechanism where possible.
- Ensure failed cleanup operations can be retried.
- Do not lose Blob URLs when project metadata is deleted.
- If `projectSpec.create` fails after a Blob upload, only delete the uploaded Blob when it is known that the database write did not commit.
- If the database commit status is uncertain, establish the actual state before deleting anything.
- Never delete a Blob that is still referenced by a committed database record.

Inspect the current Prisma schema, migrations, and cleanup implementation before proposing database changes.

Do not create a destructive migration or assume an existing cleanup table or mechanism without verifying it.

### D. Liveblocks room authorization and feed provisioning

File:
- `app/api/liveblocks-auth/route.ts`

Investigate the dependency between room token issuance and feed provisioning.

Requirements:
- A failure in `ensureRoomFeed` should not automatically prevent room authorization when the user is otherwise authorized and room storage is available.
- Handle feed provisioning independently.
- Preserve appropriate retry and error handling.
- Do not expose unauthorized room access.
- Do not silently ignore failures that could leave the application in an inconsistent state.

---

# Phase 3: AI generation and Trigger.dev reliability

### A. OpenRouter incomplete responses

Files:
- `trigger/generate-spec.ts`
- `trigger/design-agent.ts`

Requirements:
- Reject incomplete specification output when `finishReason` is `"length"`, even if some Markdown content was returned.
- Treat Nemotron incomplete JSON responses caused by `"length"` as retryable where appropriate.
- Keep retry attempts bounded.
- Preserve existing abort handling.
- Avoid retrying permanent errors unnecessarily.
- Do not treat partial output as a successful design plan or specification.

### B. Design-agent edge handling

File:
- `trigger/design-agent.ts`

Investigate how the agent processes nodes, edges, additions, deletions, and updates.

Requirements:
- If an edge references a node that has not yet been added, defer the edge rather than immediately discarding it.
- Retry deferred edges after the relevant node additions have been processed.
- Preserve action ordering.
- Respect node deletions and edits.
- Do not report successful completion until planned edges have been resolved or explicitly handled.
- Avoid creating invalid or duplicate edges.

### C. Long node IDs

File:
- `trigger/design-agent.ts`

Investigate the handling of node IDs longer than 80 characters.

Requirements:
- Ensure IDs remain consistent across node storage, edge references, updates, and subsequent actions.
- Prefer preserving original IDs.
- If mapping is unavoidable, use a collision-safe mapping and apply it consistently.
- Do not silently truncate IDs and create broken references.

### D. Accurate applied-action reporting

File:
- `trigger/design-agent.ts`

Requirements:
- Count only actual canvas changes as applied actions.
- Missing-endpoint edges must not count as successful changes.
- Duplicate additions must not count as successful changes.
- No-op deletions must not count as successful changes.
- Use existing reporting mechanisms to record skipped or unsuccessful actions.
- Keep reported results consistent with the actual canvas state.

### E. Concurrent design runs and room presence

File:
- `trigger/design-agent.ts`

Investigate overlapping AI design runs in the same room.

Requirements:
- Track active runs per room where appropriate.
- Do not clear room presence or mark the room idle while another run is still active.
- Preserve the enabled composer behavior during active generation.
- Handle overlapping completion, failure, and retry scenarios safely.
- Avoid one task overwriting another task's room activity state.

### F. Canvas restoration and synchronization

File:
- `trigger/design-agent.ts`

Investigate interactions between:
- `compactCanvasContext`
- `generateDesignPlan`
- Room restoration
- Canvas reads and mutations

Requirements:
- Wait until the saved room snapshot has been fully restored before reading or modifying the canvas.
- Avoid generating a plan from an incomplete canvas.
- Avoid overwriting changes while another client is restoring the room.
- Preserve existing synchronization behavior.
- Do not introduce unnecessary waiting or deadlocks.

### G. Trigger.dev abort signal propagation

Files:
- `.agents/skills/trigger-authoring-chat-agent/SKILL.md`
- Matching `.claude` skill copy.

Requirements:
- Forward the generation abort signal through `run` to `runAgentLoop`.
- Pass the signal to `streamText` using the documented API.
- Ensure cancellation actually stops the relevant generation.
- Keep both skill copies consistent.

---

# Phase 4: AI sidebar and frontend behavior

### A. Specification preview layering

File:
- `components/editor/ai-sidebar.tsx`

Ensure the specification preview appears above the sidebar when intended.

Requirements:
- Fix the z-index and backdrop stacking issue.
- Preserve the sidebar's existing z-60 behavior.
- Verify the preview, backdrop, and sidebar interaction on different screen sizes.
- Avoid changing unrelated styling.

### B. Specification run completion state

File:
- `components/editor/ai-sidebar.tsx`

Investigate the `useEffect` and `finishSpecRun` flow.

Requirements:
- Avoid synchronously updating state inside an effect in a way that violates React lint rules.
- Still correctly complete a specification run if metadata becomes complete before the terminal task event arrives.
- Avoid duplicate completion handling.
- Preserve loading, error, progress, and retry states.

### C. Durable AI result publication

File:
- `components/editor/ai-sidebar.tsx`

Investigate where final AI results are published to the `ai-chat` feed.

Requirements:
- Move final result publication out of a sidebar-only completion effect and into a durable task-completion path where appropriate.
- Ensure results are published even if the initiating user leaves the page or reloads.
- Avoid duplicate feed messages.
- Ensure exactly one final result is published per run.
- Remove duplicate `createFeedMessage` calls if the durable path already handles publication.
- Preserve the existing message format and feed behavior.

### D. Prevent stale-canvas specification generation

File:
- `components/editor/ai-sidebar.tsx`

Requirements:
- Prevent `generateSpec` from running while a design update is still in progress.
- Ensure the specification is generated from the updated canvas rather than stale data.
- Keep the action unavailable until the updated design is reflected in the canvas.
- Preserve existing UI feedback.

### E. Token request failure and retry

File:
- `components/editor/ai-sidebar.tsx`

Requirements:
- If token acquisition fails, retain the queued `runId`.
- Allow the user to retry tracking the same run.
- Do not start another generation merely because token acquisition failed.
- Preserve the existing task lifecycle and error messages.

### F. Shared processing status

File:
- `components/editor/ai-sidebar.tsx`

Investigate stale processing or retrying status after a failed terminal status write.

Requirements:
- Reconcile shared status with the actual task lifecycle.
- Do not leave the composer permanently blocked after a run has ended.
- Continue blocking the composer while a run is genuinely active.
- Handle failed, cancelled, completed, and retrying states correctly.

### G. Workflow orchestration hook

File:
- `components/editor/ai-sidebar.tsx`

Investigate the suggestion to extract request, token, and run orchestration from `generateSpec` into a dedicated hook.

Only implement this if it materially improves separation of concerns without increasing complexity or introducing regressions.

If implemented:
- Keep the sidebar responsible for invoking the workflow and rendering its state.
- Preserve loading, error, progress, and retry behavior.
- Avoid changing public component behavior.
- Do not perform a broad frontend refactor.

---

# Phase 5: Markdown, layout, and UI fixes

### A. Preserve literal trailing hashes

File:
- `components/editor/spec-markdown.tsx`

Ensure heading parsing does not incorrectly remove literal trailing hashes from text such as `C#`.

Requirements:
- Preserve legitimate Markdown heading behavior.
- Preserve literal trailing `#` characters.
- Add a regression test for `C#`.
- Do not weaken unrelated Markdown parsing.

### B. Unicode line separators in list parsing

File:
- `components/editor/spec-markdown.tsx`

Ensure list-item matching handles:
- U+2028 LINE SEPARATOR
- U+2029 PARAGRAPH SEPARATOR

Preserve existing marker and whitespace matching behavior.

Add focused tests for the affected cases.

### C. Starter templates modal sizing

File:
- `components/editor/starter-templates-modal.tsx`

Add the missing `sm:max-w-none` behavior where required.

Preserve the existing modal layout and responsive behavior.

### D. Singleton node positioning

File:
- `trigger/design-agent.ts`

Ensure an independent singleton node receives the appropriate below-content offset.

Important:
- Preserve the existing behavior for a singleton node connected to an existing node.
- Add a regression test for the distinction.
- Ensure generated layout does not unintentionally move existing nodes.

### E. Generated graph layout test

File:
- `tests/design-agent-retry.test.ts`

Extend the relevant `layoutGeneratedGraph` test:
- Add a second node connected to the first.
- Assert that both added nodes retain their original positions after the layout function.
- Exercise the existing-node connection guard, not only the independent singleton case.

---

# Phase 6: Specification input limits

File:
- `lib/spec-generation-schema.ts`

Investigate the serialized canvas input budget.

Requirements:
- Establish a model-safe input budget before a generation task is queued.
- Consider the actual serialized canvas size and the model's context constraints.
- Reject or handle oversized input before starting expensive generation.
- Provide a useful error message.
- Preserve valid existing inputs.
- Do not choose an arbitrary threshold without explaining its basis.
- Avoid breaking existing canvas serialization or schema compatibility.

---

# Phase 7: Trigger.dev skill documentation consistency

These are documentation changes. Do not unnecessarily modify runtime application code while addressing them.

### A. Advanced chat-agent skill

Files:
- `.agents/skills/trigger-chat-agent-advanced/SKILL.md`
- Matching `.claude` copy.

Requirements:
- Treat `analyzeConversation` output as untrusted context, never as system instructions.
- Use managed Trigger.dev `streamText` from the run callback in examples.
- Ensure the chat example sends messages through `session.in` using the established input envelope.
- Read replies from `session.out`.
- Preserve lazy-session behavior.
- Ensure `onTurnComplete` awaits conversation analysis and calls `chat.inject` before returning.
- Ensure instructions intended for the next turn are injected before the agent suspends or exits.

### B. Realtime skill input-stream tokens

File:
- `.agents/skills/trigger-realtime/SKILL.md`

Requirements:
- Explain that input-stream writing requires a token scoped to the relevant `runId`.
- Use the established token-minting flow.
- Do not document a generic token as sufficient if it is not.

### C. Realtime combined-hook example

Files:
- `.agents/skills/trigger-realtime/SKILL.md`
- Matching `.claude` copy.

Requirements:
- Use `auth.createTriggerPublicToken("my-task")` for the task-specific token in the Runner combined-hook example.
- Pass the token to `useRealtimeTaskTrigger`.
- Follow the actual installed SDK API and established project patterns.

### D. Realtime run hook

File:
- `.claude/skills/trigger-realtime/SKILL.md`

Ensure the `useRealtimeRun` example passes `handle?.id` as the first argument.

Preserve the existing `accessToken` and `enabled` guard.

### E. Realtime token renewal documentation

File:
- `.claude/skills/trigger-realtime/SKILL.md`

Explain how a long-running subscription can renew expired tokens using `refreshAccessToken` to obtain a new run-scoped token from an authenticated backend.

Only document APIs and token flows that are actually supported by the installed SDK and existing project implementation. Do not invent undocumented methods or token sources.

### F. Trigger.dev setup skills

Files:
- `.agents/skills/trigger-setup/SKILL.md`
- Relevant matching `.claude` setup skills.

Requirements:
- Correct the type-only import path for `helloWorld` to match the actual task file location.
- Use a Trigger.dev CLI version compatible with the installed SDK rather than blindly using `npx trigger.dev@latest dev`.
- Before adding `TRIGGER_SECRET_KEY` to an environment file, verify that the file is ignored and untracked.
- If the file is not safely excluded from version control, do not place secrets in it.
- Keep examples consistent with the actual repository.

### G. Trigger.dev task idempotency documentation

Files:
- `.agents/skills/trigger-tasks/SKILL.md`
- Relevant duplicate/common-mistakes documentation.

Requirements:
- Explain that global-scope idempotency deduplication lasts only until the idempotency key expires.
- Document the default 30-day TTL accurately.
- Explain when independent deduplication is needed for one-time operations.
- Avoid implying that idempotency provides permanent deduplication.

### H. Chat-agent lifecycle documentation

Files:
- `.agents/skills/trigger-authoring-chat-agent/SKILL.md`
- Matching `.claude` copy.

Requirements:
- Distinguish idle suspension, where in-memory state can be retained, from crash recovery, where a new worker does not retain the previous process heap.
- Explain which state must be persisted and restored for crash recovery.
- Correct documentation locations and version claims.
- Refer to installed documentation under `node_modules/@trigger.dev/sdk/docs/ai-chat/` where appropriate.
- Identify the installed SDK version from `node_modules/@trigger.dev/sdk/package.json`.
- Do not claim that the repository skill automatically updates with the installed SDK.
- Ensure source frontmatter and documentation references are accurate.

### I. Advanced chat skill documentation provenance

Files:
- `.agents/skills/trigger-chat-agent-advanced/SKILL.md`
- Matching `.claude` copy.

Correct version and documentation provenance claims.

Use actual installed SDK documentation and package information. Keep the two copies consistent.

### J. Claude task skill provenance

File:
- `.claude/skills/trigger-tasks/SKILL.md`

Requirements:
- Do not claim that the repository copy is bundled with or automatically synchronized to the installed SDK.
- Direct users to the installed package's `skills/trigger-authoring-tasks/SKILL.md` and documentation under `@trigger.dev/sdk/docs/`.
- Retain accurate sources guidance.

### K. Trigger.dev cost-savings skill

File:
- `.claude/skills/trigger-cost-savings/SKILL.md`

Requirements:
- Explain that a sub-second runtime alone does not prove a task is overprovisioned.
- Include CPU usage, deadline, and measured cost per run in the assessment.
- Update the `process-images` cost estimate in both copies using current, verified compute and per-run rates and measured duration.
- Account for the per-run charge.
- Do not invent prices or measurements. If actual measurements are unavailable, clearly identify the missing data rather than fabricating an estimate.

---

# Phase 8: Documentation coverage and final validation

### A. Docstring coverage

Address the failed Docstring Coverage pre-merge check.

Requirements:
- Identify functions actually missing required docstrings.
- Add concise, meaningful docstrings that explain purpose, parameters, return values, and important behavior where appropriate.
- Follow the existing project documentation style.
- Do not add meaningless comments simply to satisfy a coverage threshold.
- Avoid documenting obvious implementation details or changing runtime behavior.

### B. Consistency across duplicated skills

Where the review identifies matching `.agents` and `.claude` skill copies:
- Update both copies consistently.
- Verify that examples, API names, version claims, and instructions match.
- Do not modify unrelated documentation.

### C. Final validation

After all valid findings have been addressed:

1. Run the project's relevant test suites.
2. Run TypeScript checks.
3. Run ESLint and relevant formatting checks.
4. Run the Docstring Coverage check again.
5. Run focused tests for security, task recovery, design-agent behavior, Markdown parsing, and specification generation.
6. Verify Prisma schema and migration consistency if database changes were necessary.
7. Verify that no environment secrets or generated files were accidentally modified.
8. Inspect the complete Git diff.
9. Check for accidental changes outside the review scope.
10. Verify that all affected `.agents` and `.claude` skill copies remain consistent.

If a check fails:
- Determine whether the failure was introduced by your changes or existed beforehand.
- Fix regressions caused by your changes.
- Do not hide failures or report a check as passed when it was not run.

## 3. Final report

When finished, provide a concise but detailed report containing:

**1. Fixed findings**
- Group changes by phase.
- Identify the files changed.
- Explain the root cause and fix briefly.

**2. Skipped findings**
- List findings that were already resolved, incorrect, or unsafe to implement.
- Explain the reason for each.

**3. Validation results**
- List each test and check that was actually executed.
- Clearly state passed, failed, or not run.

**4. Remaining risks**
- Mention any issue that still needs manual verification or further investigation.

**5. Change summary**
- Summarize the overall impact and approximate number of files changed.

## Final instruction

Work carefully and prioritize correctness over speed.

Do not assume that fixing a CodeRabbit comment automatically makes the application safer or more reliable. Verify the underlying behavior.

Preserve all existing working features, APIs, UI behavior, authentication flows, task lifecycle behavior, and data integrity unless a specific verified finding requires a change.

**Do not commit, push, deploy, or make unrelated changes.**