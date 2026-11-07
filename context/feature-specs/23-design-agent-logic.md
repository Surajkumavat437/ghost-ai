Implement the full AI design agent so a user prompt results in real-time updates on the collaborative canvas, with visible AI presence and status.

## Implementation

1. Update the design agent task in `trigger/design-agent.ts`.

   Before implementing:
   - check `context/project-overview.md` and `context/architecture-context.md` for product behavior and system rules
   - Before implementing, check Liveblocks and Trigger.dev agent skills for current patterns on canvas mutation and background task execution.
   - follow the existing Trigger.dev setup and agent patterns already in the project
   - reuse existing Liveblocks flow and presence patterns instead of creating new ones

   Then implement:
   - use OpenRouter (`@openrouter/sdk`) with NVIDIA Nemotron 3 Nano Omni (`nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`) to interpret the user prompt
   - update the canvas using the existing collaborative flow utilities
   - support actions like:
     - add node
     - move node
     - resize node
     - update node data
     - delete node
     - add edge
     - delete edge

   - publish AI activity to the shared status feed so all users see progress
   - update AI presence (cursor + thinking state) while the task runs
   - push clear status messages at key steps (start, processing, complete)

   - ensure generated designs follow:
     - allowed node shapes
     - color palette
     - connected architecture layers with labeled data-flow edges
     - stable left-to-right layout derived from graph connections, with clear spacing
     - enough canvas actions to include the requested components and their relationships
   - when a generated graph is independent of existing canvas nodes, lay it out as a separate group below existing content; preserve model placement when actions explicitly connect to existing nodes

   - handle errors gracefully and update status if something fails
   - clear AI presence when the task finishes

## Dependencies

- Check whether `@openrouter/sdk` is already installed. If not, install it using the project's existing package manager.
- Install any other required missing packages without changing unrelated dependencies.
- `NVIDIA_OMNI_API_KEY` is already in `.env.local`.

## Scope Limits

- don't change canvas architecture
- don't introduce a new state system outside Liveblocks
- don't bypass existing collaborative flow utilities

## Check When Done

- Design task updates the canvas through the existing collaborative flow.
- AI presence and status are visible to all participants.
- Status messages reflect task progress.
- Errors are handled without breaking the canvas.
- `npm run build` passes.
