# Architecture Context

## Stack

| Layer            | Technology              | Role                                                           |
| ---------------- | ----------------------- | -------------------------------------------------------------- |
| Framework        | Next.js 16 + TypeScript | Full-stack app with server/client boundaries                   |
| UI               | Tailwind + shadcn/ui    | Component composition and styling                              |
| Auth             | Clerk                   | User identity and route protection                             |
| Database         | Prisma + PostgreSQL     | Relational metadata: projects, collaborators, specs, task runs |
| Canvas           | Liveblocks + React Flow | Real-time collaborative canvas, presence, and cursors          |
| Background tasks | Trigger.dev + Vercel Cron | Durable AI generation and Liveblocks cleanup workflows      |
| Artifact storage | Vercel Blob             | Canvas snapshots and generated Markdown specs                  |

## System Boundaries

- `app/api` — Authenticated request handlers: input validation, ownership checks, task triggering, and persistence. The secret-protected cron route retries Liveblocks room cleanup outbox entries.
- `trigger` — Long-running background jobs: AI design generation and spec generation.
- `lib` — Shared infrastructure: Prisma client, access control helpers, and utilities.
- `components` — UI composition: canvas surfaces, sidebars, dialogs, and interactive elements.
- `prisma` — Database schema and generated client output.
- `data` — Legacy local directory. Not used for new artifacts.

## Storage Model

- **Database**: metadata, ownership, relationships, and task run records.
- **Vercel Blob**: generated artifacts — canvas snapshots at `canvas/{projectId}.json` and specs at `specs/{projectId}/{specId}.md`.
- Project records, spec records, and task run records belong in PostgreSQL.
- Liveblocks room cleanup outbox rows also belong in PostgreSQL and have no project foreign key, so they survive project deletion.
- Canvas content and Markdown output are stored in and retrieved from Vercel Blob.
- The blob URL is stored in the database (`canvasJsonPath`, `filePath`) as the reference to the artifact.

## Auth and Collaboration Model

- Every project has a single owner (Clerk user ID).
- Projects can include additional collaborators.
- Only authenticated users can access protected routes.
- Only the owner or a collaborator can mutate project resources.
- Liveblocks room tokens are issued only after verifying project membership.
- A project's Liveblocks room ID equals its project ID. Owner deletion and outbox enqueue commit in one transaction; room deletion happens after commit and is retried by Vercel Cron.
- Room provisioning, project deletion, and cleanup use the same PostgreSQL advisory lock. Cleanup rechecks that the project is absent before deleting, and treats an already-missing Liveblocks room as success.

## Starter System Designs

- Prebuilt templates are static canvas snapshots stored in the codebase.
- Templates are loaded into the active Liveblocks room when a user imports one.
- Import can occur on canvas creation or from within the editor at any time.
- Template data follows the same node/edge schema as user-created canvas content.
- Templates do not require a separate database record; they are resolved by template ID at import time.

## AI Generation Model

### Design Generation

- Input: user prompt, project context, and current canvas state.
- Execution: durable background task via Trigger.dev using OpenRouter's `nvidia/nemotron-3-nano-30b-a3b` model for a validated set of canvas actions. The Trigger task reads `NVIDIA_OMNI_API_KEY` from its runtime environment. Empty provider answers retry up to three times before the task reports a clear failure.
- Output: node and edge changes are applied through Liveblocks Storage mutations to the existing React Flow `flow` state, preserving the shared room as the source of truth. Independent generated node groups are arranged in connected left-to-right layers and placed below existing canvas content; actions that connect to existing nodes retain their generated placement.
- The AI publishes shared status messages to the Liveblocks `ai-status-feed` and presence (`cursor` and `thinking`) while it runs; presence expires automatically if a task is interrupted. Sidebar status is derived from the newest validated feed message.
- The AI sidebar room chat uses a separate room-scoped Liveblocks `ai-chat` feed. Chat messages are validated against the shared Zod contract before display; chat never shares the AI progress feed.

### Spec Generation

- Input: current canvas graph and project chat context.
- Execution: durable background task via Trigger.dev; completed Markdown is saved as a private Vercel Blob at `specs/{projectId}/{specId}.md`.
- Output: Markdown technical spec linked to the project through a `ProjectSpec` metadata record in PostgreSQL. Authenticated project members download it through the project spec download route.

## Invariants

1. Request handlers do not run long-lived AI work — that belongs in background tasks.
2. Metadata and large generated artifacts are stored in separate layers.
3. Auth and ownership are enforced at every mutation boundary.
4. Client components are used only where browser interactivity or real-time state requires them.
5. The canvas schema must remain consistent between user-created content and imported templates.
