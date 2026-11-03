### Task: Investigate and Optimize Canvas Saving Performance

I want you to investigate why saving my canvas takes a long time on the first attempt but becomes significantly faster on the second attempt.

My application uses React Flow, Next.js, Vercel Blob for canvas storage, and Prisma with PostgreSQL to store the Blob URL.

### 1. Identify why the first save is slow

Trace the complete saving lifecycle, from clicking Save until the canvas is successfully persisted.

Investigate whether the delay is caused by:
- Initial connection establishment or cold starts.
- Vercel Blob upload initialization.
- Network connection, DNS resolution, TLS handshake, or connection reuse.
- Request serialization and canvas snapshot generation.
- Next.js serverless function cold starts.
- Clerk authentication or project authorization.
- Prisma database connection initialization.
- Blob upload and URL generation.
- Any unnecessary sequential operations or duplicate requests.

Compare the first and second save attempts and identify exactly which operation accounts for the additional delay.

Do not assume that Blob link generation is the problem. Determine whether the URL is generated during upload or whether another operation is responsible for the delay.

### 2. Optimize the actual saving process

If the delay can be reduced safely, implement the most appropriate optimization.

Consider:
- Reusing connections where supported.
- Avoiding unnecessary initialization and repeated operations.
- Optimizing snapshot serialization.
- Reducing unnecessary network requests.
- Optimizing Prisma operations.
- Avoiding redundant authentication or authorization checks without weakening security.
- Using supported Vercel Blob SDK capabilities efficiently.
- Preventing duplicate or overlapping save operations.

Do not introduce artificial delays, background work that can lose data, or premature success responses.

**Important:** Never sacrifice data integrity, reliability, or successful persistence just to make the Save button appear faster.

### 3. Improve the Save button behavior

If the actual upload or URL generation cannot be made significantly faster without compromising functionality, improve the UI experience instead.

Evaluate these approaches:

**Option A: Disable the Save button while saving**
- Prevent multiple save requests.
- Show a clear Saving indicator.
- Re-enable the button after success or failure.

**Option B: Hide the Save button during initialization**
- Only consider this if there is a genuine initialization or connection-establishment phase.
- Restore the button once the saving mechanism is ready.
- Do not hide it during normal canvas editing.

**Option C: Show a proper saving state**
- Replace the button with a subtle progress indicator while saving.
- Show Saved after successful persistence.
- Show Retry with a meaningful error message if saving fails.

Choose the simplest approach that provides a good user experience.

### 4. Preserve existing functionality

These requirements are mandatory:

- Do not change the existing Vercel Blob storage architecture.
- Do not change the Prisma schema or database relationships.
- Preserve existing authentication and project authorization.
- Preserve React Flow functionality and canvas data integrity.
- Do not break existing canvas loading or saving.
- Do not introduce unnecessary dependencies.
- Do not rewrite working code unnecessarily.
- Ensure retry functionality remains reliable.
- Ensure failed uploads never get reported as successful.

### 5. Measure and verify the improvement

Add temporary diagnostic timing measurements around:

1. Save button click.
2. Snapshot generation.
3. Frontend request dispatch.
4. API route entry.
5. Authentication and authorization.
6. Blob upload start and completion.
7. Prisma update start and completion.
8. Final frontend response.

Compare the first and second save attempts using the same or equivalent canvas payload.

Run relevant tests, TypeScript checks, lint, and production build.

### Expected result

I want the first save to be as fast as reasonably possible without compromising reliability.

If the first save is inherently slower because of cold starts or connection initialization, provide a clear explanation and implement an appropriate UI state rather than attempting unsafe optimizations.

### Final report

After completing the task, explain:

1. The actual reason the first save was slower.
2. Why the second save was faster.
3. Which operations consumed the most time.
4. What optimizations you implemented.
5. Whether the Save button UI needed changes.
6. Before-and-after timing measurements.
7. Any remaining limitations.

Do not guess the root cause or claim performance improvements without measurement.

### CRITICAL: EXISTING FUNCTIONALITY PROTECTION

My canvas saving functionality is currently working. Do not break, replace, rewrite, or unnecessarily refactor any existing working implementation.

This task is primarily a performance investigation and optimization task, NOT a feature redevelopment task.

Follow these rules strictly:

1. First inspect and understand the existing implementation before making any changes.
2. Treat the current working save and load functionality as the baseline.
3. Do not modify the existing storage architecture, API contracts, Prisma schema, authentication, authorization, or React Flow implementation unless you identify a specific, measurable problem that requires a minimal change.
4. Do not replace working functions or introduce alternative saving mechanisms.
5. Prefer isolated, backward-compatible performance optimizations.
6. If an optimization introduces any risk to data integrity or existing functionality, do not implement it.
7. Do not modify unrelated files or components.
8. Preserve existing error handling, retry functionality, and canvas persistence behavior.
9. Before changing any critical saving logic, explain the proposed change and its potential impact.
10. If no safe optimization is identified, leave the saving implementation untouched and improve only the loading/saving UI feedback if necessary.

**Mandatory verification:** After every change, verify that:
- Existing canvas data can still be saved.
- Previously saved canvases can still be loaded.
- Updating an existing canvas works.
- Failed saves can be retried.
- Multiple clicks cannot cause conflicting saves.
- Authentication and project permissions remain intact.

If you cannot confidently preserve existing behavior, do not modify that part of the implementation.