# Debug and Fix OpenRouter Integration in Ghost AI

Investigate and fix the error occurring when the Trigger.dev `design-agent` task attempts to generate a design plan using OpenRouter and the NVIDIA Nemotron model.

**Current error:**

```text
AbortTaskRunError:
OpenRouter could not generate a design plan.
Check your API key and prompt, then try again.

at generateDesignPlan (trigger/design-agent.ts:156)
at run (trigger/design-agent.ts:384)
```

**Confirmed working:**
- The OpenRouter API key is valid.
- `GET https://openrouter.ai/api/v1/key` succeeds.
- A direct PowerShell request to `POST https://openrouter.ai/api/v1/chat/completions` succeeds.
- The model successfully returns a response using:

`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`

Therefore, do not assume the API key or model is the problem.

## 1. Investigate the root cause

Inspect the complete implementation of:
- `trigger/design-agent.ts`
- `generateDesignPlan()`
- OpenRouter SDK initialization and request construction
- Response extraction and JSON parsing
- The system prompt and design-plan output schema
- Trigger.dev environment variable configuration
- Error handling, retries and timeouts

Determine exactly why the direct API test succeeds but the Trigger.dev task fails.

Check specifically for:

- Incorrect OpenRouter SDK usage or initialization.
- Incorrect model identifier.
- Incorrect request parameters or message structure.
- Incorrect environment variable name (`NVIDIA_OMNI_API_KEY`).
- SDK response structure being accessed incorrectly.
- Empty or unexpected model response.
- Reasoning content being confused with the final answer.
- JSON extraction or parsing failures.
- Model output not matching the expected `actions` schema.
- Timeout, abort signal, or retry handling problems.
- Errors being swallowed and replaced with generic `AbortTaskRunError` messages.

Do not guess. Use actual logs, source code, and the SDK's installed version and documentation to establish the cause.

## 2. Improve error tracking

Replace generic error handling that hides the original provider error.

Add structured, useful logging for:
- Provider and model.
- HTTP status code.
- Provider error message.
- Response structure.
- Response finish reason.
- Empty response detection.
- JSON parsing failures.
- Schema validation failures.
- Retry attempts and timeout errors.

Never log API keys, authorization headers, or other secrets.

Preserve the original error and its cause when wrapping errors.

## 3. Fix the actual problem

After identifying the root cause:

- Implement the smallest reliable fix.
- Ensure the OpenRouter request uses the correct API and SDK conventions.
- Ensure the model's final response is extracted correctly.
- Ensure JSON parsing handles markdown fences and surrounding text safely when necessary.
- Validate the returned design plan before applying canvas actions.
- Handle empty, malformed, or unexpected responses gracefully.
- Implement appropriate retry handling for transient failures.
- Do not retry permanent authentication, configuration, or validation errors unnecessarily.
- Preserve cancellation and timeout behavior.

## 4. Preserve existing architecture

Do not rewrite the application.

Keep the existing:
- Trigger.dev task structure.
- Liveblocks integration.
- Real-time AI presence and status updates.
- Canvas action types and validation.
- Node positioning and spacing logic.
- Edge creation and deletion.
- Cleanup and cancellation behavior.
- Existing project folder structure.

Only change code necessary to fix the OpenRouter integration and its error handling.

## 5. Verify the fix

Run the relevant TypeScript checks, tests, and available project validation commands.

Test the complete flow:

1. Trigger the design-agent task.
2. Send a prompt requesting a login system architecture.
3. Verify that Nemotron returns a valid design plan.
4. Verify that the returned actions pass validation.
5. Verify that nodes and edges are created in Liveblocks.
6. Verify that errors are reported accurately if generation fails.

Use this test prompt:

"Design a basic login system architecture. Include a React frontend with login and registration pages, a Node.js and Express backend exposing authentication REST APIs, a PostgreSQL database storing user accounts, password hashing using bcrypt, and JWT-based authentication. Show how these components communicate and connect them with appropriate arrows."

## Final requirement

Before finishing, explain:

1. The exact root cause.
2. The files modified.
3. What changes were made.
4. Why the fix works.
5. Whether the complete Trigger.dev-to-Liveblocks flow was successfully tested.

Do not claim the issue is fixed unless the relevant tests actually pass.

## CRITICAL: SAFETY AND BACKWARD COMPATIBILITY

This is an existing, working application. Your priority is to fix the OpenRouter generation failure without breaking any previously working functionality.

Follow these rules strictly:

1. **Inspect before modifying:** Read the existing implementation and understand how its components interact before making changes.
2. **Minimal changes only:** Modify only the code directly responsible for the OpenRouter integration, response handling, and error reporting.
3. **Preserve existing behavior:** Do not remove, rename, restructure, or rewrite existing functions, components, interfaces, types, task definitions, or workflows unless absolutely necessary to fix the identified issue.
4. **No unnecessary refactoring:** Do not improve unrelated code, change formatting across files, upgrade dependencies, or introduce new architectural patterns.
5. **Preserve integrations:** Do not break Trigger.dev, Liveblocks, canvas synchronization, real-time presence, node operations, edge operations, or cleanup logic.
6. **Protect configuration:** Do not overwrite `.env.local`, modify existing environment variables unnecessarily, or expose API keys.
7. **Test before concluding:** Run TypeScript checks and relevant tests. Verify that existing functionality remains intact.
8. **Review changes:** Before finishing, inspect your changes and explain exactly what was modified and why.

If a proposed change could affect existing functionality, investigate its impact before applying it. Prefer the smallest reversible change

**Do not rewrite the application. Fix the specific bug while preserving everything else.**